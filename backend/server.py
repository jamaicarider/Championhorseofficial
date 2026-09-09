from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import base64
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict

import jwt
import bcrypt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
SHIPPING_FLAT = float(os.environ.get('SHIPPING_FLAT', '25.00'))
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')

PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

# Object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "champion-horse"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("champion-horse")

app = FastAPI(title="Champion Horse API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
              "gif": "image/gif", "webp": "image/webp"}

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(email: str) -> str:
    payload = {"sub": email, "role": "admin", "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    admin = await db.admins.find_one({"email": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Administrador não encontrado")
    return admin

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ColorOpt(BaseModel):
    name: str
    hex: str

class ProductIn(BaseModel):
    name: str
    description: str = ""
    price: float
    images: List[str] = []
    colors: List[ColorOpt] = []
    sizes: List[str] = []
    stock: Dict[str, int] = {}  # key = "Color|Size"
    category: str = "Camisetas"
    active: bool = True
    featured: bool = False

class Product(ProductIn):
    id: str
    created_at: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CartItem(BaseModel):
    product_id: str
    name: str
    image: str = ""
    color: str
    size: str
    price: float
    quantity: int

class Customer(BaseModel):
    name: str
    email: EmailStr
    cpf: str = ""
    phone: str = ""

class Address(BaseModel):
    cep: str = ""
    rua: str = ""
    numero: str = ""
    bairro: str = ""
    cidade: str = ""
    estado: str = ""
    complemento: str = ""

class OrderIn(BaseModel):
    items: List[CartItem]
    customer: Customer
    address: Address

class StatusUpdate(BaseModel):
    status: str
    tracking: Optional[str] = None

# ---------------------------------------------------------------------------
# Public store routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Champion Horse API"}

@api_router.get("/config")
async def config():
    return {"paypal_client_id": PAYPAL_CLIENT_ID, "paypal_mode": PAYPAL_MODE,
            "shipping_flat": SHIPPING_FLAT, "currency": "BRL"}

@api_router.get("/products")
async def list_products(featured: Optional[bool] = None, q: Optional[str] = None):
    query = {"active": True}
    if featured is not None:
        query["featured"] = featured
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    docs = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return doc

# ---------------------------------------------------------------------------
# Admin auth
# ---------------------------------------------------------------------------
@api_router.post("/admin/login")
async def admin_login(body: LoginIn):
    admin = await db.admins.find_one({"email": body.email.lower()})
    if not admin or not verify_password(body.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(admin["email"])
    return {"token": token, "admin": {"email": admin["email"], "name": admin.get("name", "Admin")}}

@api_router.get("/admin/me")
async def admin_me(admin: dict = Depends(get_current_admin)):
    return admin

# ---------------------------------------------------------------------------
# Admin products CRUD
# ---------------------------------------------------------------------------
@api_router.get("/admin/products")
async def admin_list_products(admin: dict = Depends(get_current_admin)):
    return await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/admin/products")
async def admin_create_product(body: ProductIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, body: ProductIn, admin: dict = Depends(get_current_admin)):
    res = await db.products.update_one({"id": product_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return await db.products.find_one({"id": product_id}, {"_id": 0})

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}

# ---------------------------------------------------------------------------
# Image upload / serve
# ---------------------------------------------------------------------------
@api_router.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png")
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"],
        "original_filename": file.filename, "content_type": content_type,
        "size": result.get("size", len(data)), "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()})
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    ct = record.get("content_type") if record else "application/octet-stream"
    data, fetched_ct = get_object(path)
    return Response(content=data, media_type=ct or fetched_ct)

# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
def compute_totals(items: List[CartItem]):
    subtotal = round(sum(i.price * i.quantity for i in items), 2)
    shipping = 0.0 if subtotal >= 300 else SHIPPING_FLAT
    total = round(subtotal + shipping, 2)
    return subtotal, shipping, total

@api_router.post("/orders")
async def create_order(body: OrderIn):
    if not body.items:
        raise HTTPException(status_code=400, detail="Carrinho vazio")
    subtotal, shipping, total = compute_totals(body.items)
    order_id = str(uuid.uuid4())
    doc = {
        "id": order_id,
        "items": [i.model_dump() for i in body.items],
        "customer": body.customer.model_dump(),
        "address": body.address.model_dump(),
        "subtotal": subtotal, "shipping": shipping, "total": total,
        "status": "aguardando_pagamento",
        "paypal_order_id": None, "tracking": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return doc

@api_router.get("/admin/orders")
async def admin_list_orders(admin: dict = Depends(get_current_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_status(order_id: str, body: StatusUpdate, admin: dict = Depends(get_current_admin)):
    valid = {"aguardando_pagamento", "pago", "enviado", "entregue", "cancelado"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail="Status inválido")
    update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.tracking is not None:
        update["tracking"] = body.tracking
    res = await db.orders.update_one({"id": order_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return await db.orders.find_one({"id": order_id}, {"_id": 0})

# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------
def paypal_token() -> str:
    auth = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_SECRET}".encode()).decode()
    resp = requests.post(f"{PAYPAL_BASE}/v1/oauth2/token",
                         headers={"Authorization": f"Basic {auth}",
                                  "Content-Type": "application/x-www-form-urlencoded"},
                         data={"grant_type": "client_credentials"}, timeout=30)
    resp.raise_for_status()
    return resp.json()["access_token"]

async def mark_order_paid(order_id: str, paypal_order_id: Optional[str] = None):
    update = {"status": "pago", "updated_at": datetime.now(timezone.utc).isoformat()}
    if paypal_order_id:
        update["paypal_order_id"] = paypal_order_id
    await db.orders.update_one({"id": order_id, "status": {"$ne": "pago"}}, {"$set": update})

@api_router.post("/paypal/create-order")
async def paypal_create_order(payload: dict):
    order_id = payload.get("order_id")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    token = paypal_token()
    body = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": order_id,
            "custom_id": order_id,
            "description": "Champion Horse",
            "amount": {"currency_code": "BRL", "value": f"{order['total']:.2f}"},
        }],
        "application_context": {
            "brand_name": "Champion Horse",
            "locale": "pt-BR",
            "landing_page": "LOGIN",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "PAY_NOW",
            "return_url": f"{FRONTEND_URL}/checkout/sucesso?order={order_id}",
            "cancel_url": f"{FRONTEND_URL}/checkout/erro?order={order_id}",
        },
    }
    resp = requests.post(f"{PAYPAL_BASE}/v2/checkout/orders",
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                         json=body, timeout=30)
    if resp.status_code not in (200, 201):
        logger.error("PayPal create order failed: %s", resp.text)
        raise HTTPException(status_code=502, detail="Falha ao criar pagamento PayPal")
    data = resp.json()
    await db.orders.update_one({"id": order_id}, {"$set": {"paypal_order_id": data["id"]}})
    approve = next((l["href"] for l in data.get("links", []) if l["rel"] == "approve"), None)
    return {"paypal_order_id": data["id"], "approve_url": approve}

@api_router.post("/paypal/capture")
async def paypal_capture(payload: dict):
    paypal_order_id = payload.get("paypal_order_id")
    if not paypal_order_id:
        raise HTTPException(status_code=400, detail="paypal_order_id ausente")
    token = paypal_token()
    resp = requests.post(f"{PAYPAL_BASE}/v2/checkout/orders/{paypal_order_id}/capture",
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                         timeout=30)
    data = resp.json()
    if resp.status_code not in (200, 201):
        logger.error("PayPal capture failed: %s", resp.text)
        raise HTTPException(status_code=502, detail="Falha ao capturar pagamento")
    pu = (data.get("purchase_units") or [{}])[0]
    order_id = pu.get("reference_id") or pu.get("custom_id")
    status = data.get("status")
    if status == "COMPLETED" and order_id:
        await mark_order_paid(order_id, paypal_order_id)
    order = await db.orders.find_one({"id": order_id}, {"_id": 0}) if order_id else None
    return {"status": status, "order": order}

@api_router.post("/webhook/paypal")
async def paypal_webhook(request: Request):
    try:
        event = await request.json()
    except Exception:
        return {"status": "ignored"}
    etype = event.get("event_type", "")
    resource = event.get("resource", {})
    order_id = None
    if etype in ("PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING"):
        order_id = resource.get("custom_id")
    elif etype in ("CHECKOUT.ORDER.APPROVED", "CHECKOUT.ORDER.COMPLETED"):
        pus = resource.get("purchase_units") or [{}]
        order_id = pus[0].get("custom_id") or pus[0].get("reference_id")
    if etype in ("PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.COMPLETED") and order_id:
        await mark_order_paid(order_id, resource.get("id"))
    logger.info("PayPal webhook %s order=%s", etype, order_id)
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
SEED_IMAGES = [
    "https://static.prod-images.emergentagent.com/jobs/e4bf4d81-e5d4-47d6-93eb-dde1d3299de5/images/f958398cc3ace0e373e466d4cda66dfcca3f1084b8cc95041988040e5995ec05.jpeg",
    "https://static.prod-images.emergentagent.com/jobs/e4bf4d81-e5d4-47d6-93eb-dde1d3299de5/images/be3232dddf9ec1f935e57dd8e9affbe618e9ea52fab18b94abcee154cfd2f4dd.jpeg",
    "https://static.prod-images.emergentagent.com/jobs/e4bf4d81-e5d4-47d6-93eb-dde1d3299de5/images/3fb02b0663ccfd2638bd04b28b9addad0f27f8c74e9847f002408c53818f7b33.jpeg",
]

async def seed_admin():
    email = ADMIN_EMAIL.lower()
    existing = await db.admins.find_one({"email": email})
    if existing is None:
        await db.admins.insert_one({"email": email, "password_hash": hash_password(ADMIN_PASSWORD),
                                    "name": "Lucas", "role": "admin",
                                    "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info("Admin seeded")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.admins.update_one({"email": email}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logger.info("Admin password updated")

async def seed_product():
    if await db.products.count_documents({}) > 0:
        return
    colors = [{"name": "Preto", "hex": "#111111"}, {"name": "Branco", "hex": "#F5F5F5"}]
    sizes = ["P", "M", "G", "GG"]
    stock = {f"{c['name']}|{s}": 15 for c in colors for s in sizes}
    doc = {
        "id": str(uuid.uuid4()),
        "name": "Camiseta Champion Horse",
        "description": "Camiseta oversized de algodão premium com estampa Champion Horse. Corte streetwear, gola reforçada e caimento amplo. Peça-conceito da coleção de estreia.",
        "price": 189.90,
        "images": SEED_IMAGES,
        "colors": colors,
        "sizes": sizes,
        "stock": stock,
        "category": "Camisetas",
        "active": True,
        "featured": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(dict(doc))
    logger.info("Seed product created")

@app.on_event("startup")
async def startup():
    await db.admins.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await seed_admin()
    await seed_product()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
