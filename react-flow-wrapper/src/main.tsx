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
    onRedo: "function",
    // "method" (not "function"): "function" stringifies the callback to its name and looks it
    // up as a *global* function via the attribute round-trip — direct instance callbacks like
    // Angular's `el.onOpenWorkflowList = this.onOpenWorkflowList` end up wiped to `undefined`.
    // "method" binds and forwards the assigned function as-is. (This same issue likely affects
    // onSave/onImport/onExport/onUndo/onRedo above too — left untouched to avoid changing
    // their established fallback-to-default behavior.)
    onOpenWorkflowList: "method",
    onSelectWorkflow: "method"
  }
});

customElements.define("react-flow-builder", WebFlow);