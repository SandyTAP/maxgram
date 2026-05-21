from flask import Flask, jsonify, request
from flask_cors import CORS
import uuid
import qrcode
import base64
from io import BytesIO
import threading
import time
from PIL import Image
app = Flask(__name__)
CORS(app)

DOMAIN = "http://192.168.0.100:5000"
# DOMAIN = "https://maxspise.com"
expired_secound = 5
sessions = {}
phone_sessions = {}

"""
sessions = {
    token: {
        "status": "waiting",
        "created_at": time.time()
    }
}
"""



def cleanup():
    while True:
        now = time.time()

        expired = []
        expired_phone = []

        for token, data in sessions.items():
            if now - data["created_at"] > expired_secound:
                expired.append(token)

        for token, data in phone_sessions.items():
            if now - data["created_at"] > 300:
                expired_phone.append(token)

        for token in expired:
            del sessions[token]

        for token in expired_phone:
            del phone_sessions[token]

        time.sleep(10)


threading.Thread(target=cleanup, daemon=True).start()



@app.route("/api/create-qr")
def create_qr():

    token = str(uuid.uuid4())

    sessions[token] = {
        "status": "waiting",
        "created_at": time.time()
    }

    auth_url = f"{DOMAIN}/auth/{token}"




    qr = qrcode.QRCode(
        version=4,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=14,
        border=2
    )

    qr.add_data(auth_url)

    qr.make(fit=True)

    img = qr.make_image(
        fill_color="white",
        back_color="#0e1621"
    ).convert("RGBA")




    logo = Image.open("logo.png").convert("RGBA")

    logo_size = img.size[0] // 4

    logo = logo.resize(
        (logo_size, logo_size),
        Image.LANCZOS
    )




    background = Image.new(
        "RGBA",
        (logo_size + 40, logo_size + 40),
        (14, 22, 33, 255)
    )

    bg_pos = (
        (img.size[0] - background.size[0]) // 2,
        (img.size[1] - background.size[1]) // 2
    )

    img.paste(background, bg_pos, background)




    logo_pos = (
        (img.size[0] - logo_size) // 2,
        (img.size[1] - logo_size) // 2
    )

    img.paste(logo, logo_pos, mask=logo)




    buffer = BytesIO()

    img.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(
        buffer.getvalue()
    ).decode()


    return jsonify({
        "token": token,
        "authUrl": auth_url,
        "qr": f"data:image/png;base64,{qr_base64}"
    })



@app.route("/api/status/<token>")
def status(token):

    session = sessions.get(token)

    if not session:
        return jsonify({
            "status": "expired"
        })

    return jsonify({
        "status": session["status"]
    })



@app.route("/api/approve/<token>", methods=["POST"])
def approve(token):
    session = sessions.get(token)

    if not session:
        return jsonify({
            "error": "not found"
        }), 404

    session["status"] = "approved"

    return jsonify({
        "success": True
    })

@app.route("/api/phone/start", methods=["POST"])
def phone_start():
    data = request.get_json(silent=True) or {}
    phone = "".join(
        char for char in data.get("phone", "")
        if char.isdigit()
    )

    if phone.startswith("8") and len(phone) == 11:
        phone = "7" + phone[1:]

    if len(phone) == 10:
        phone = "7" + phone

    if not phone.startswith("7") or len(phone) != 11:
        return jsonify({
            "error": "Введите российский номер телефона"
        }), 400

    token = str(uuid.uuid4())
    code = str(uuid.uuid4().int % 1000000).zfill(6)

    phone_sessions[token] = {
        "phone": phone,
        "code": code,
        "status": "code_sent",
        "created_at": time.time()
    }

    return jsonify({
        "token": token,
        "status": "code_sent",
        "devCode": code
    })

@app.route("/api/phone/verify", methods=["POST"])
def phone_verify():
    data = request.get_json(silent=True) or {}
    token = data.get("token", "")
    code = "".join(
        char for char in data.get("code", "")
        if char.isdigit()
    )

    session = phone_sessions.get(token)

    if not session:
        return jsonify({
            "error": "Код устарел, запросите новый"
        }), 404

    if session["code"] != code:
        return jsonify({
            "error": "Неверный код"
        }), 400

    session["status"] = "approved"

    return jsonify({
        "success": True,
        "phone": session["phone"]
    })

@app.route("/auth/<token>")
def auth_page(token):

    if token not in sessions:
        return "Invalid token", 404

    return f"""
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>MaxSpise Auth</title>

        <style>

        body {{
            margin: 0;
            background: #0e1621;
            color: white;
            font-family: Arial;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }}

        .box {{
            background: #17212b;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            width: 300px;
        }}

        button {{
            margin-top: 20px;
            border: none;
            background: #3390ec;
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
        }}

        </style>

    </head>
    <body>

        <div class="box">

            <h2>MaxSpise</h2>

            <p>Подтвердить вход?</p>

            <button onclick="approve()">
                Подтвердить
            </button>

        </div>

        <script>

        async function approve() {{

            await fetch('/api/approve/{token}', {{
                method: 'POST'
            }});

            document.body.innerHTML = `
                <div style="
                    color:white;
                    font-family:Arial;
                    display:flex;
                    justify-content:center;
                    align-items:center;
                    height:100vh;
                ">
                    Вход подтверждён
                </div>
            `;

        }}

        </script>

    </body>
    </html>
    """
@app.route("/")
def home():
    return "MaxSpise auth server running"


app.run(host="0.0.0.0", port=5000)
