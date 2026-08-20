from app.models import (
    Collector,
    CrossFieldPredicate,
    DataContract,
    FieldContract,
    PolicyMode,
    Severity,
)

DEMO_COLLECTOR_ID = "books-to-scrape"


def demo_contract() -> DataContract:
    return DataContract(
        version=1,
        row_count_min=12,
        row_count_max=12,
        max_duplicate_rate=0.0,
        unique_fields=["sku", "url"],
        canary_inputs=[
            {"url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html"},
            {
                "url": "https://books.toscrape.com/catalogue/sapiens-a-brief-history-of-humankind_996/index.html"
            },
        ],
        fields={
            "sku": FieldContract(type="string"),
            "title": FieldContract(type="string", max_null_rate=0.0),
            "price": FieldContract(type="number", minimum=0, maximum=10000),
            "list_price": FieldContract(type="number", minimum=0, maximum=10000),
            "availability": FieldContract(
                type="string",
                allowed_values=["in_stock", "low_stock", "out_of_stock"],
            ),
            "url": FieldContract(type="string", format="url"),
            "rating": FieldContract(
                type="string", allowed_values=["One", "Two", "Three", "Four", "Five"]
            ),
            "category": FieldContract(type="string"),
            "description": FieldContract(type="string"),
            "image_url": FieldContract(type="string", format="url"),
        },
        predicates=[
            CrossFieldPredicate(
                expression="price <= list_price",
                message="Sale price cannot exceed list price.",
                severity=Severity.BLOCKING,
            )
        ],
    )


def demo_collector(
    brightdata_collector_id: str = "c_msxcshnz2bwrroekf3",
) -> Collector:
    return Collector(
        id=DEMO_COLLECTOR_ID,
        name="Books to Scrape catalog",
        brightdata_collector_id=brightdata_collector_id,
        inputs=[{"url": "https://books.toscrape.com/"}],
        owner="data-platform",
        environment="production",
        failure_budget_minutes=60,
        policy_mode=PolicyMode.PROPOSE,
        contract=demo_contract(),
    )
