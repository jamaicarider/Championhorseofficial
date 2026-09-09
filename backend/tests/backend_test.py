"""Backend API tests for Champion Horse ecommerce."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://minimal-ecommerce-8.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "lucaswork.contato@gmail.com"
ADMIN_PASSWORD = "Merda@2021"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "admin" in data
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Public config / products ----------
class TestPublic:
    def test_config(self):
        r = requests.get(f"{API}/config", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("paypal_client_id")
        assert d.get("currency") == "BRL"
        assert d.get("shipping_flat") == 25.0

    def test_products_list(self):
        r = requests.get(f"{API}/products", timeout=30)
        assert r.status_code == 200
        products = r.json()
        assert isinstance(products, list)
        assert len(products) >= 1
        p = products[0]
        assert "id" in p and "name" in p and "price" in p
        assert "_id" not in p

    def test_product_detail(self):
        products = requests.get(f"{API}/products", timeout=30).json()
        pid = products[0]["id"]
        r = requests.get(f"{API}/products/{pid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_product_404(self):
        r = requests.get(f"{API}/products/nonexistent-id", timeout=30)
        assert r.status_code == 404


# ---------- Admin auth ----------
class TestAdminAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me_no_token(self):
        r = requests.get(f"{API}/admin/me", timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/admin/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_admin_products_no_auth(self):
        assert requests.get(f"{API}/admin/products", timeout=30).status_code == 401
        assert requests.post(f"{API}/admin/products", json={"name": "x", "price": 1}, timeout=30).status_code == 401


# ---------- Admin products CRUD ----------
class TestAdminProducts:
    def test_crud(self, auth_headers):
        payload = {
            "name": "TEST_Product", "description": "test",
            "price": 99.9, "images": [], "colors": [{"name": "Preto", "hex": "#000"}],
            "sizes": ["M"], "stock": {"Preto|M": 5}, "category": "Camisetas",
            "active": True, "featured": False,
        }
        r = requests.post(f"{API}/admin/products", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()
        pid = created["id"]
        assert created["name"] == "TEST_Product"

        # list
        r = requests.get(f"{API}/admin/products", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # update
        payload["name"] = "TEST_Product_Updated"
        payload["price"] = 120.0
        r = requests.put(f"{API}/admin/products/{pid}", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Product_Updated"

        # verify via public
        r = requests.get(f"{API}/products/{pid}", timeout=30)
        assert r.status_code == 200 and r.json()["price"] == 120.0

        # delete
        r = requests.delete(f"{API}/admin/products/{pid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200

        # verify gone
        r = requests.get(f"{API}/products/{pid}", timeout=30)
        assert r.status_code == 404


# ---------- Image upload ----------
class TestUpload:
    def test_upload_and_serve(self, auth_headers):
        # 1x1 PNG
        png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100"
                            "0d0a2db40000000049454e44ae426082")
        files = {"file": ("t.png", png, "image/png")}
        r = requests.post(f"{API}/admin/upload", headers=auth_headers, files=files, timeout=60)
        if r.status_code != 200:
            pytest.skip(f"Storage integration unavailable: {r.status_code} {r.text[:200]}")
        data = r.json()
        assert "url" in data and "path" in data
        assert data["url"].startswith("/api/files/")
        r2 = requests.get(f"{BASE_URL}{data['url']}", timeout=30)
        assert r2.status_code == 200
        assert len(r2.content) > 0


# ---------- Orders ----------
@pytest.fixture(scope="class")
def order_id():
    products = requests.get(f"{API}/products", timeout=30).json()
    p = products[0]
    color = p["colors"][0]["name"]
    size = p["sizes"][0]
    body = {
        "items": [{"product_id": p["id"], "name": p["name"], "image": "",
                   "color": color, "size": size, "price": p["price"], "quantity": 1}],
        "customer": {"name": "Test User", "email": "test@example.com", "cpf": "", "phone": ""},
        "address": {"cep": "01000-000", "rua": "Rua X", "numero": "1", "bairro": "Centro",
                    "cidade": "SP", "estado": "SP", "complemento": ""},
    }
    r = requests.post(f"{API}/orders", json=body, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


class TestOrders:
    def test_create_order_shipping(self, order_id):
        d = order_id
        assert d["status"] == "aguardando_pagamento"
        # price 189.90 < 300 -> shipping 25
        assert d["shipping"] == 25.0
        assert round(d["total"], 2) == round(d["subtotal"] + 25.0, 2)

    def test_free_shipping_above_300(self):
        body = {
            "items": [{"product_id": "x", "name": "X", "image": "", "color": "Preto",
                       "size": "M", "price": 350.0, "quantity": 1}],
            "customer": {"name": "T", "email": "t@t.com"},
            "address": {"cep": "1"},
        }
        r = requests.post(f"{API}/orders", json=body, timeout=30)
        assert r.status_code == 200
        assert r.json()["shipping"] == 0.0

    def test_empty_cart(self):
        body = {"items": [], "customer": {"name": "T", "email": "t@t.com"}, "address": {}}
        r = requests.post(f"{API}/orders", json=body, timeout=30)
        assert r.status_code == 400

    def test_get_order(self, order_id):
        oid = order_id["id"]
        r = requests.get(f"{API}/orders/{oid}", timeout=30)
        assert r.status_code == 200 and r.json()["id"] == oid

    def test_admin_orders_list(self, auth_headers, order_id):
        r = requests.get(f"{API}/admin/orders", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert any(o["id"] == order_id["id"] for o in r.json())

    def test_admin_orders_no_auth(self):
        assert requests.get(f"{API}/admin/orders", timeout=30).status_code == 401

    def test_admin_status_update(self, auth_headers, order_id):
        oid = order_id["id"]
        r = requests.put(f"{API}/admin/orders/{oid}/status", headers=auth_headers,
                         json={"status": "enviado", "tracking": "BR123"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "enviado"
        assert r.json()["tracking"] == "BR123"

    def test_admin_status_invalid(self, auth_headers, order_id):
        oid = order_id["id"]
        r = requests.put(f"{API}/admin/orders/{oid}/status", headers=auth_headers,
                        json={"status": "bogus"}, timeout=30)
        assert r.status_code == 400


# ---------- PayPal ----------
class TestPayPal:
    def test_create_paypal_order(self, order_id):
        r = requests.post(f"{API}/paypal/create-order", json={"order_id": order_id["id"]}, timeout=60)
        if r.status_code == 502:
            pytest.skip(f"PayPal sandbox unavailable: {r.text[:200]}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("paypal_order_id")
        assert d.get("approve_url", "").startswith("https://")

    def test_webhook_marks_paid(self):
        # create fresh order
        body = {
            "items": [{"product_id": "x", "name": "X", "image": "", "color": "Preto",
                       "size": "M", "price": 100.0, "quantity": 1}],
            "customer": {"name": "T", "email": "t@t.com"},
            "address": {"cep": "1"},
        }
        order = requests.post(f"{API}/orders", json=body, timeout=30).json()
        oid = order["id"]
        event = {"event_type": "PAYMENT.CAPTURE.COMPLETED",
                 "resource": {"id": "CAP123", "custom_id": oid}}
        r = requests.post(f"{API}/webhook/paypal", json=event, timeout=30)
        assert r.status_code == 200
        got = requests.get(f"{API}/orders/{oid}", timeout=30).json()
        assert got["status"] == "pago"
