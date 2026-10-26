import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app

def test_home():
    client = app.test_client()
    response = client.get("/")

    assert response.status_code == 200