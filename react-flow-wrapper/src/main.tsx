import React from "react";
import ReactDOM from "react-dom/client";
import reactToWebComponent from "react-to-webcomponent";
import FlowComponent from "./FlowComponent";

const WebFlow = reactToWebComponent(FlowComponent, React, ReactDOM, {
  props: {
    saveTrigger: "number"
  }
});

customElements.define("react-flow-builder", WebFlow);