import httpx

from app.brightdata_client import HttpBrightDataAdapter, parse_brightdata_dataset_response
from app.seed import demo_collector
from app.settings import Settings


def test_live_dataset_parser_accepts_ndjson_and_normalizes_provider_values():
    response = httpx.Response(
        200,
        text=(
            '{"sku":"one","price":{"value":22.65,"currency":"GBP"},'
            '"list_price":{"value":30.0,"currency":"GBP"},'
            '"availability":"in_stock","input":{"url":"https://example.com"}}\n'
            '{"sku":"two","price":{"value":10.0,"currency":"GBP"},'
            '"list_price":{"value":10.0,"currency":"GBP"},'
            '"availability":"low_stock","input":{"url":"https://example.com"}}\n'
        ),
    )

    rows = parse_brightdata_dataset_response(response)

    assert len(rows) == 2
    assert rows[0]["price"] == 22.65
    assert rows[0]["list_price"] == 30.0
    assert "input" not in rows[0]


def test_live_dataset_parser_keeps_in_progress_payload_unresolved():
    response = httpx.Response(202, json={"status": "building", "message": "pending"})

    assert parse_brightdata_dataset_response(response) is None


def test_http_adapter_collects_real_provider_shape_and_keeps_job_id():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/dca/trigger":
            return httpx.Response(200, json={"collection_id": "j_live_123"})
        return httpx.Response(
            200,
            text=(
                '{"sku":"one","price":{"value":22.65},'
                '"list_price":{"value":30.0},"availability":"in_stock"}\n'
            ),
        )

    adapter = HttpBrightDataAdapter(
        Settings(app_env="production", brightdata_api_token="test-token")
    )
    adapter.client = httpx.Client(
        base_url="https://api.brightdata.com",
        transport=httpx.MockTransport(handler),
    )

    rows = adapter.collect(demo_collector())

    assert adapter.last_collection_id == "j_live_123"
    assert rows == [
        {
            "sku": "one",
            "price": 22.65,
            "list_price": 30.0,
            "availability": "in_stock",
        }
    ]


def test_http_adapter_records_auto_saved_self_healing_as_published():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            assert request.url.path.endswith("/resume_automation_job")
            return httpx.Response(200, json={"id": "ia_live_123", "queued": True})
        return httpx.Response(
            200,
            json={
                "id": "ia_live_123",
                "status": "done",
                "success": True,
                "preview_result": [
                    {
                        "sku": "one",
                        "price": {"value": 22.65},
                        "list_price": {"value": 30.0},
                        "availability": "in_stock",
                    }
                ],
            },
        )

    adapter = HttpBrightDataAdapter(
        Settings(app_env="production", brightdata_api_token="test-token")
    )
    adapter.client = httpx.Client(
        base_url="https://api.brightdata.com",
        transport=httpx.MockTransport(handler),
    )

    accepted = adapter.accept_candidate(
        demo_collector(),
        {
            "provider": "brightdata",
            "job_id": "ia_live_123",
            "requires_provider_accept": True,
            "requires_publish": True,
            "draft_status": "awaiting_acceptance",
        },
    )

    assert accepted["status"] == "done"
    assert accepted["requires_provider_accept"] is False
    assert accepted["draft_status"] == "published"
    assert accepted["published_at"]
    assert accepted["preview_rows"][0]["price"] == 22.65
