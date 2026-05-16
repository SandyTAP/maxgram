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


let pollingInterval = null;

function startPolling() {

    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    pollingInterval = setInterval(async () => {

        if (!currentToken) return;

        try {

            const response = await fetch(
                `http://localhost:5000/api/status/${currentToken}`
            );

            const data = await response.json();

            if (data.status === "approved") {

                clearInterval(pollingInterval);

                console.log("Успешный вход");

                alert("Вход выполнен");

                // window.location.href = "/app";

            }

            if (data.status === "expired") {

                clearInterval(pollingInterval);

                console.log("QR expired");

                document
                    .getElementById("qrExpired")
                    .classList.remove("hidden");

            }

        } catch (err) {

            console.error(
                "Ошибка проверки статуса:",
                err
            );

        }

    }, 2000);

}


document
    .getElementById("refreshBtn")
    .addEventListener("click", async () => {

        document
            .getElementById("qrExpired")
            .classList.add("hidden");

        await loadQR();

    });


loadQR();