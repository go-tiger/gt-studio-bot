import { Injectable, Logger } from '@nestjs/common';
import { Context, On } from 'necord';
import type { ContextOf } from 'necord';

@Injectable()
export class ErrorEvent {
  private readonly logger = new Logger(ErrorEvent.name);

  @On('error')
  public onError(@Context() [error]: ContextOf<'error'>) {
    this.logger.error(error.message, error.stack);
  }
}
