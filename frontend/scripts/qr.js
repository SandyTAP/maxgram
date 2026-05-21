let currentToken = null;
let pollingInterval = null;

const qr = document.getElementById("qr");
const qrExpired = document.getElementById("qrExpired");
const refreshBtn = document.getElementById("refreshBtn");


async function loadQR() {

    try {


        qrExpired.classList.add("hidden");

        qr.classList.remove("blurred");


        const response = await fetch(
            "http://localhost:5000/api/create-qr"
        );

        const data = await response.json();

        qr.src = data.qr;

        currentToken = data.token;

        startPolling();

    } catch (err) {

        console.error(
            "Ошибка загрузки QR:",
            err
        );

    }

}


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


            // успешный вход
            if (data.status === "approved") {

                clearInterval(pollingInterval);

                console.log("Успешный вход");

                alert("Вход выполнен");

                // window.location.href = "/app";
            }



            if (data.status === "expired") {

                clearInterval(pollingInterval);

                console.log("QR expired");


                qrExpired.classList.remove("hidden");


                qr.classList.add("blurred");
                showExpiredText();


            }

        } catch (err) {

            console.error(
                "Ошибка проверки статуса:",
                err
            );

        }

    }, 2000);

}

function stopQrPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}



refreshBtn.addEventListener("click", async () => {

    await loadQR();
    resetExpiredText();
});



loadQR();

window.loadQR = loadQR;
window.stopQrPolling = stopQrPolling;
