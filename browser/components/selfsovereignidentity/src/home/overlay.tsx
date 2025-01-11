/*
HomeOverlay is the view itself and contains all of the methods to manipute the overlay and messaging.
It does not contain any logic for saving or communication with the extension or server.
*/

import React from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import Selfsovereignidentity from "../components/Selfsovereignidentity";

// eslint-disable-next-line no-var
var HomeOverlay = function () {
  this.inited = false;
  this.active = false;
};

HomeOverlay.prototype = {
  create() {
    if (this.active) {
      return;
    }

    this.active = true;

    const container = document.querySelector(`body`);
    const root = createRoot(container);
    root.render(
      <ChakraProvider>
        <Selfsovereignidentity />
      </ChakraProvider>
    );

    // if (window?.matchMedia(`(prefers-color-scheme: dark)`).matches) {
    //   document.querySelector(`body`).classList.add(`theme_dark`);
    // }
  },
};

export default HomeOverlay;
