import React from "react";
import ReactDOM from "react-dom/client";
import reactToWebComponent from "react-to-webcomponent";
import FlowComponent from "./FlowComponent";

const WebFlow = reactToWebComponent(FlowComponent, React, ReactDOM, {
  props: {
    saveTrigger: "number",
    showHeader: "boolean",
    onSave: "function",
    onImport: "function",
    onExport: "function",
    onUndo: "function",
    onRedo: "function"
  }
});

customElements.define("react-flow-builder", WebFlow);