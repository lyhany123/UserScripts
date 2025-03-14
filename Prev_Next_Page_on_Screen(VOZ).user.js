// ==UserScript==
// @name         Prev Next Page on Screen
// @namespace    Violentmonkey Scripts
// @version      1.0
// @description  Clone and keep it fixed on the screen
// @author       king1x32
// @match        https://voz.vn/*
// @grant        none
// ==/UserScript==

(function() {
    "use strict";
    function cloneAndFixDiv() {
        const originalDiv = document.querySelector(".block-outer-main");
        if (originalDiv) {
            const clonedDiv = originalDiv.cloneNode(true);
            Object.assign(clonedDiv.style, {
                position: "fixed",
                bottom: "25px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "auto",
                zIndex: "2000000 !important",
                backgroundColor: "transparent",
            });
            document.body.appendChild(clonedDiv);
        }
    }
    window.addEventListener("load", cloneAndFixDiv);
})();
