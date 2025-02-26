/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {Component, OnDestroy} from '@angular/core';
import {IntentClient, IntentMessage, MessageClient, MessageHeaders, Qualifier, TopicMessage} from '@scion/microfrontend-platform';
import {ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {Subject, Subscription} from 'rxjs';
import {distinctUntilChanged, finalize, startWith, takeUntil} from 'rxjs/operators';
import {SciParamsEnterComponent, SciParamsEnterModule} from '@scion/components.internal/params-enter';
import {Beans} from '@scion/toolkit/bean-manager';
import {NgFor, NgIf} from '@angular/common';
import {SciFormFieldModule} from '@scion/components.internal/form-field';
import {SciListModule} from '@scion/components.internal/list';
import {MessageListItemComponent} from '../message-list-item/message-list-item.component';

export const FLAVOR = 'flavor';
export const DESTINATION = 'destination';
export const TOPIC = 'topic';
export const TYPE = 'type';
export const QUALIFIER = 'qualifier';

enum MessagingFlavor {
  Topic = 'Topic', Intent = 'Intent',
}

@Component({
  selector: 'app-receive-message',
  templateUrl: './receive-message.component.html',
  styleUrls: ['./receive-message.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    ReactiveFormsModule,
    SciFormFieldModule,
    SciParamsEnterModule,
    SciListModule,
    MessageListItemComponent,
  ],
})
export default class ReceiveMessageComponent implements OnDestroy {

  public FLAVOR = FLAVOR;
  public DESTINATION = DESTINATION;
  public TOPIC = TOPIC;
  public TYPE = TYPE;
  public QUALIFIER = QUALIFIER;

  private _destroy$ = new Subject<void>();
  private _messageClient: MessageClient;
  private _intentClient: IntentClient;
  private _subscription: Subscription;

  public form: UntypedFormGroup;
  public messages: (TopicMessage | IntentMessage)[] = [];
  public MessagingFlavor = MessagingFlavor;
  public MessageHeaders = MessageHeaders;
  public subscribeError: string;

  constructor(private _formBuilder: UntypedFormBuilder) {
    this._messageClient = Beans.get(MessageClient);
    this._intentClient = Beans.get(IntentClient);

    this.form = this._formBuilder.group({
      [FLAVOR]: new UntypedFormControl(MessagingFlavor.Topic, Validators.required),
      [DESTINATION]: this.createTopicDestinationFormGroup(),
    });

    this.form.get(FLAVOR).valueChanges
      .pipe(
        startWith(this.form.get(FLAVOR).value as MessagingFlavor),
        distinctUntilChanged(),
        takeUntil(this._destroy$),
      )
      .subscribe((flavor: string) => {
        this.onFlavorChange(MessagingFlavor[flavor]);
      });
  }

  private onFlavorChange(flavor: MessagingFlavor): void {
    if (flavor === MessagingFlavor.Topic) {
      this.form.setControl(DESTINATION, this.createTopicDestinationFormGroup());
    }
    else {
      this.form.setControl(DESTINATION, this.createIntentDestinationFormGroup());
    }
  }

  public onSubscribe(): void {
    this.isTopicMessaging() ? this.subscribeTopic() : this.subscribeIntent();
  }

  private subscribeTopic(): void {
    this.form.disable();
    this.subscribeError = null;
    try {
      this._subscription = this._messageClient.observe$(this.form.get(DESTINATION).get(TOPIC).value)
        .pipe(finalize(() => this.form.enable()))
        .subscribe({
          next: message => this.messages.push(message),
          error: error => this.subscribeError = error,
        });
    }
    catch (error) {
      this.form.enable();
      this.subscribeError = error;
    }
  }

  private subscribeIntent(): void {
    const type: string = this.form.get(DESTINATION).get(TYPE).value;
    const qualifier: Qualifier = SciParamsEnterComponent.toParamsDictionary(this.form.get(DESTINATION).get(QUALIFIER) as UntypedFormArray);

    this.form.disable();
    this.subscribeError = null;
    try {
      this._subscription = this._intentClient.observe$({type, qualifier})
        .pipe(finalize(() => this.form.enable()))
        .subscribe({
          next: message => this.messages.push(message),
          error: error => this.subscribeError = error,
        });
    }
    catch (error) {
      this.form.enable();
      this.subscribeError = error;
    }
  }

  public onUnsubscribe(): void {
    this.unsubscribe();
  }

  public onClear(): void {
    this.messages.length = 0;
  }

  public onReply(replyTo: string): void {
    this._messageClient.publish(replyTo, 'this is a reply');
  }

  public get isSubscribed(): boolean {
    return this._subscription && !this._subscription.closed;
  }

  public isTopicMessaging(): boolean {
    return this.form.get(FLAVOR).value === MessagingFlavor.Topic;
  }

  private createIntentDestinationFormGroup(): UntypedFormGroup {
    return this._formBuilder.group({
      [TYPE]: this._formBuilder.control(''),
      [QUALIFIER]: this._formBuilder.array([]),
    });
  }

  private createTopicDestinationFormGroup(): UntypedFormGroup {
    return this._formBuilder.group({
      [TOPIC]: new UntypedFormControl('', Validators.required),
    });
  }

  private unsubscribe(): void {
    this._subscription && this._subscription.unsubscribe();
    this._subscription = null;
    this.messages.length = 0;
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this.unsubscribe();
  }
}
