import type { WorkflowPersistPayloadV1 } from "../workflow/types";

export interface AIResponse {
  message: string;
  workflow?: WorkflowPersistPayloadV1;
}

/**
 * Mock AI Service - Demo để upload document, analyze, và generate workflow
 * Trong production, thay bằng real API call to backend
 */
export const mockAIService = {
  async processDocument(file: File, userMessage: string): Promise<AIResponse> {
    const fileName = file.name.toLowerCase();

    if (fileName.includes("payment") || userMessage.toLowerCase().includes("payment")) {
      return generatePaymentWorkflow();
    }
    if (fileName.includes("order") || userMessage.toLowerCase().includes("order")) {
      return generateOrderWorkflow();
    }
    return generateApprovalWorkflow();
  },

  async sendMessage(message: string): Promise<AIResponse> {
    if (message.toLowerCase().includes("payment")) {
      return generatePaymentWorkflow();
    }
    if (message.toLowerCase().includes("order")) {
      return generateOrderWorkflow();
    }
    if (message.toLowerCase().includes("approval")) {
      return generateApprovalWorkflow();
    }

    return {
      message: "I can help you create workflows. Try asking about payment, order, or approval workflows!"
    };
  }
};

// ============= Demo Workflow Generators =============

function generatePaymentWorkflow(): AIResponse {
  const workflow: WorkflowPersistPayloadV1 = {
    version: "1.0",
    nodes: [
      {
        id: "1",
        type: "start-event",
        label: "Payment Request",
        position: { x: 100, y: 100 },
        fields: [
          {
            id: "f1",
            type: "text",
            label: "Payment ID",
            options: []
          },
          {
            id: "f2",
            type: "text",
            label: "Amount",
            options: []
          },
          {
            id: "f3",
            type: "select",
            label: "Payment Method",
            options: [
              { id: "opt1", label: "Credit Card" },
              { id: "opt2", label: "Bank Transfer" },
              { id: "opt3", label: "Digital Wallet" }
            ]
          }
        ]
      },
      {
        id: "2",
        type: "activity",
        label: "Validate Payment",
        position: { x: 100, y: 200 },
        fields: [
          {
            id: "f4",
            type: "text",
            label: "Validation Rules",
            options: []
          },
          {
            id: "f5",
            type: "radio",
            label: "Check CVV",
            options: [
              { id: "opt1", label: "Yes" },
              { id: "opt2", label: "No" }
            ]
          }
        ]
      },
      {
        id: "3",
        type: "condition",
        label: "Check Amount",
        position: { x: 350, y: 200 },
        routingCondition: "amount > 10000",
        branchConditions: {
          "true": "Requires Approval",
          "false": "Auto Process"
        },
        fields: [
          {
            id: "f6",
            type: "text",
            label: "Threshold Amount",
            options: []
          }
        ]
      },
      {
        id: "4",
        type: "activity",
        label: "Request Approval",
        position: { x: 100, y: 350 },
        fields: [
          {
            id: "f7",
            type: "select",
            label: "Approval Level",
            options: [
              { id: "opt1", label: "Manager" },
              { id: "opt2", label: "Director" },
              { id: "opt3", label: "CFO" }
            ]
          },
          {
            id: "f8",
            type: "textarea",
            label: "Approval Notes",
            options: []
          }
        ],
        configProperties: [
          {
            id: "cfg1",
            displayName: "Approval Timeout",
            key: "timeout_hours",
            value: "24"
          },
          {
            id: "cfg2",
            displayName: "Escalate After",
            key: "escalate_hours",
            value: "8"
          }
        ]
      },
      {
        id: "5",
        type: "activity",
        label: "Process Payment",
        position: { x: 350, y: 350 },
        fields: [
          {
            id: "f9",
            type: "select",
            label: "Processing Gateway",
            options: [
              { id: "opt1", label: "Stripe" },
              { id: "opt2", label: "PayPal" },
              { id: "opt3", label: "Square" }
            ]
          }
        ],
        configProperties: [
          {
            id: "cfg3",
            displayName: "Retry Count",
            key: "retry_count",
            value: "3"
          },
          {
            id: "cfg4",
            displayName: "Retry Interval",
            key: "retry_interval_seconds",
            value: "30"
          }
        ]
      },
      {
        id: "6",
        type: "end-event",
        label: "Payment Complete",
        position: { x: 550, y: 350 },
        fields: [
          {
            id: "f10",
            type: "text",
            label: "Transaction ID",
            options: []
          }
        ]
      }
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e3-5", source: "3", target: "5" },
      { id: "e4-5", source: "4", target: "5" },
      { id: "e5-6", source: "5", target: "6" }
    ]
  };

  return {
    message:
      "✅ I've created a payment workflow! It validates payments, routes large amounts for approval, then processes them.",
    workflow
  };
}

function generateOrderWorkflow(): AIResponse {
  const workflow: WorkflowPersistPayloadV1 = {
    version: "1.0",
    nodes: [
      {
        id: "1",
        type: "start-event",
        label: "Order Received",
        position: { x: 100, y: 100 },
        fields: []
      },
      {
        id: "2",
        type: "activity",
        label: "Validate Order",
        position: { x: 100, y: 200 },
        fields: []
      },
      {
        id: "3",
        type: "activity",
        label: "Check Inventory",
        position: { x: 100, y: 300 },
        fields: []
      },
      {
        id: "4",
        type: "condition",
        label: "In Stock?",
        position: { x: 350, y: 300 },
        routingCondition: "inventory > 0",
        branchConditions: {
          "true": "Ship",
          "false": "Backorder"
        },
        fields: []
      },
      {
        id: "5",
        type: "activity",
        label: "Ship Order",
        position: { x: 100, y: 450 },
        fields: []
      },
      {
        id: "6",
        type: "activity",
        label: "Backorder",
        position: { x: 550, y: 300 },
        fields: []
      },
      {
        id: "7",
        type: "end-event",
        label: "Complete",
        position: { x: 350, y: 450 },
        fields: []
      }
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e4-5", source: "4", target: "5" },
      { id: "e4-6", source: "4", target: "6" },
      { id: "e5-7", source: "5", target: "7" },
      { id: "e6-7", source: "6", target: "7" }
    ]
  };

  return {
    message: "✅ I've created an order workflow! Validates, checks inventory, ships or backo orders.",
    workflow
  };
}

function generateApprovalWorkflow(): AIResponse {
  const workflow: WorkflowPersistPayloadV1 = {
    version: "1.0",
    nodes: [
      {
        id: "1",
        type: "start-event",
        label: "Request Submitted",
        position: { x: 100, y: 100 },
        fields: []
      },
      {
        id: "2",
        type: "activity",
        label: "Manager Review",
        position: { x: 100, y: 200 },
        fields: []
      },
      {
        id: "3",
        type: "condition",
        label: "Approved?",
        position: { x: 350, y: 200 },
        routingCondition: "status == approved",
        branchConditions: {
          "true": "Yes",
          "false": "No"
        },
        fields: []
      },
      {
        id: "4",
        type: "activity",
        label: "Execute",
        position: { x: 100, y: 350 },
        fields: []
      },
      {
        id: "5",
        type: "activity",
        label: "Reject",
        position: { x: 550, y: 200 },
        fields: []
      },
      {
        id: "6",
        type: "end-event",
        label: "Done",
        position: { x: 350, y: 350 },
        fields: []
      }
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e3-5", source: "3", target: "5" },
      { id: "e4-6", source: "4", target: "6" },
      { id: "e5-6", source: "5", target: "6" }
    ]
  };

  return {
    message: "✅ I've created an approval workflow! Manager reviews, approves or rejects.",
    workflow
  };
}
