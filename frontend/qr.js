let currentToken = null;

async function loadQR() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/create-qr"
        );

        const data = await response.json();

        const qr = document.getElementById("qr");

        qr.src = data.qr;

        currentToken = data.token;

        startPolling();

    } catch (err) {

        console.error("Ошибка загрузки QR:", err);

    }

}


function startPolling() {

    setInterval(async () => {

        if (!currentToken) return;

        try {

            const response = await fetch(
                `http://localhost:5000/api/status/${currentToken}`
            );

            const data = await response.json();

            if (data.status === "approved") {

                console.log("Успешный вход");

                alert("Вход выполнен");

                // window.location.href = "/app";

            }
            if (data.status === "expired") {

            console.log("QR expired");

            alert("QR-код истёк");

            location.reload();

            }

        } catch (err) {

            console.error("Ошибка проверки статуса:", err);

        }

    }, 2000);

}


loadQR();