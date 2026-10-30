export interface HttpErrorBody {
  readonly statusCode: number;
  readonly message: string;
  readonly code: string;
  readonly requestId?: string;
}
