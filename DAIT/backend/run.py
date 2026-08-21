import os
import sys
import time
import threading
import webbrowser
import uvicorn


def resource_path(path):
    base = getattr(sys, "_MEIPASS", os.path.abspath("."))
    return os.path.join(base, path)


def get_model_path():
    return resource_path("model/thrombus_model.keras")


def open_browser():
    time.sleep(2)
    webbrowser.open("http://127.0.0.1:8000")


def main():
    # expose model path to whole backend
    os.environ["DAIT_MODEL_PATH"] = get_model_path()

    print("Starting DAIT backend...")

    # open browser automatically
    threading.Thread(target=open_browser, daemon=True).start()

    from app.main import app

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False,
        access_log=False
    )


if __name__ == "__main__":
    main()