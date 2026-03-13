import type { PermissionResponse, AskUserResponse } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";

interface PendingPermissionRequest {
  resolve: (result: PermissionResponse) => void;
  reject: (error: Error) => void;
  toolName: string;
  toolInput: Record<string, unknown>;
  createdAt: number;
}

interface PendingAskUserRequest {
  resolve: (result: AskUserResponse) => void;
  reject: (error: Error) => void;
  question: string;
  suggestions?: string[];
  createdAt: number;
}

const pendingPermissionRequests = new Map<string, PendingPermissionRequest>();
const pendingAskUserRequests = new Map<string, PendingAskUserRequest>();

const PERMISSION_TIMEOUT_MS = 300000;

export function createPermissionRequest(
  requestId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<PermissionResponse> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingPermissionRequests.delete(requestId);
      reject(new Error("Permission request timed out"));
    }, PERMISSION_TIMEOUT_MS);

    pendingPermissionRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      toolName,
      toolInput,
      createdAt: Date.now(),
    });

    logger.permission.debug("Created permission request: {requestId}", {
      requestId,
    });
  });
}

export function createAskUserRequest(
  requestId: string,
  question: string,
  suggestions?: string[],
): Promise<AskUserResponse> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingAskUserRequests.delete(requestId);
      reject(new Error("Ask user request timed out"));
    }, PERMISSION_TIMEOUT_MS);

    pendingAskUserRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      question,
      suggestions,
      createdAt: Date.now(),
    });

    logger.permission.debug("Created ask user request: {requestId}", {
      requestId,
    });
  });
}

export function resolvePermissionRequest(response: PermissionResponse): boolean {
  const pending = pendingPermissionRequests.get(response.requestId);
  if (!pending) {
    logger.permission.warn("No pending permission request: {requestId}", {
      requestId: response.requestId,
    });
    return false;
  }

  pending.resolve(response);
  pendingPermissionRequests.delete(response.requestId);
  logger.permission.debug("Resolved permission request: {requestId}", {
    requestId: response.requestId,
  });
  return true;
}

export function resolveAskUserRequest(response: AskUserResponse): boolean {
  const pending = pendingAskUserRequests.get(response.requestId);
  if (!pending) {
    logger.permission.warn("No pending ask user request: {requestId}", {
      requestId: response.requestId,
    });
    return false;
  }

  pending.resolve(response);
  pendingAskUserRequests.delete(response.requestId);
  logger.permission.debug("Resolved ask user request: {requestId}", {
    requestId: response.requestId,
  });
  return true;
}

export function cancelPermissionRequest(requestId: string): void {
  const pending = pendingPermissionRequests.get(requestId);
  if (pending) {
    pending.reject(new Error("Permission request cancelled"));
    pendingPermissionRequests.delete(requestId);
  }
}

export function cancelAskUserRequest(requestId: string): void {
  const pending = pendingAskUserRequests.get(requestId);
  if (pending) {
    pending.reject(new Error("Ask user request cancelled"));
    pendingAskUserRequests.delete(requestId);
  }
}

export function getPendingPermissionRequest(
  requestId: string,
): PendingPermissionRequest | undefined {
  return pendingPermissionRequests.get(requestId);
}

export function getPendingAskUserRequest(
  requestId: string,
): PendingAskUserRequest | undefined {
  return pendingAskUserRequests.get(requestId);
}

export function generateRequestId(): string {
  return `perm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}