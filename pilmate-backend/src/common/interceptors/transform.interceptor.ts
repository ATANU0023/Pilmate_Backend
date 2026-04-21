import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';

export interface Response<T> {
  message: string;
  statusCode: number;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const responseMessage =
      this.reflector.get<string>(RESPONSE_MESSAGE_METADATA, context.getHandler()) ||
      'Request successful';

    const statusCode = context.switchToHttp().getResponse().statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data) => {
        // If the data returned from service already contains a message, use it
        const message = data?.message || responseMessage;
        
        // Remove message from data if it was explicitly provided there
        if (data?.message) {
          delete data.message;
        }

        return {
          message,
          statusCode,
          data: data === undefined ? null : data,
        };
      }),
    );
  }
}
