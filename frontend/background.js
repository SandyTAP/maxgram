const background = document.createElement("div");

background.style.position = "fixed";
background.style.inset = "0";

background.style.backgroundImage = "url('./background.png')";
background.style.backgroundRepeat = "repeat";
background.style.backgroundSize = "1800px";

background.style.zIndex = "0";

document.body.prepend(background);