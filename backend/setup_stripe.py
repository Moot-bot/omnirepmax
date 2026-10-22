"""Setup Stripe catalog: 3 subscription plans for OMNIREPMAX.
Idempotent — safe to run multiple times."""
import os, stripe
from dotenv import load_dotenv
load_dotenv()
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {"emergent_product_id": "omnirepmax_solo", "name": "OMNIREPMAX Solo", "tax_code": "txcd_10103001",
     "prices": [{"lookup_key": "omnirepmax_solo_monthly", "amount": 6900, "currency": "brl", "interval": "month"}]},
    {"emergent_product_id": "omnirepmax_pro", "name": "OMNIREPMAX Profissional", "tax_code": "txcd_10103001",
     "prices": [{"lookup_key": "omnirepmax_pro_monthly", "amount": 9900, "currency": "brl", "interval": "month"}]},
    {"emergent_product_id": "omnirepmax_equipe", "name": "OMNIREPMAX Equipe", "tax_code": "txcd_10103001",
     "prices": [{"lookup_key": "omnirepmax_equipe_monthly", "amount": 12900, "currency": "brl", "interval": "month"}]},
]

def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(name=entry["name"], tax_code=entry.get("tax_code"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]})

def ensure_price(product, p):
    existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
    if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
        stripe.Price.modify(existing[0].id, active=False); existing = []
    if not existing:
        kwargs = dict(product=product.id, unit_amount=p["amount"], currency=p["currency"],
                      lookup_key=p["lookup_key"], transfer_lookup_key=True)
        if p.get("interval"): kwargs["recurring"] = {"interval": p["interval"]}
        return stripe.Price.create(**kwargs)
    return existing[0]

if __name__ == "__main__":
    acc = stripe.Account.retrieve()
    print(f"Account: {acc.id} country={acc.country}")
    for entry in CATALOG:
        prod = get_or_create_product(entry)
        print(f"Product: {prod.name} ({prod.id})")
        for p in entry["prices"]:
            price = ensure_price(prod, p)
            print(f"  Price {p['lookup_key']}: {price.id} = {p['amount']/100} {p['currency'].upper()}/{p.get('interval','onetime')}")
    print("Catalog ready.")
