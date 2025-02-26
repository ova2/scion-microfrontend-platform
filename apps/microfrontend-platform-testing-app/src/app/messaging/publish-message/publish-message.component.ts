/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {Component, OnDestroy} from '@angular/core';
import {IntentClient, MessageClient, Qualifier, TopicMessage} from '@scion/microfrontend-platform';
import {ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {Subject, Subscription} from 'rxjs';
import {distinctUntilChanged, finalize, startWith, takeUntil} from 'rxjs/operators';
import {SciParamsEnterComponent, SciParamsEnterModule} from '@scion/components.internal/params-enter';
import {Beans} from '@scion/toolkit/bean-manager';
import {coerceBooleanProperty, coerceNumberProperty} from '@angular/cdk/coercion';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {SciFormFieldModule} from '@scion/components.internal/form-field';
import {SciCheckboxModule} from '@scion/components.internal/checkbox';
import {TopicSubscriberCountPipe} from '../topic-subscriber-count.pipe';
import {SciListModule} from '@scion/components.internal/list';
import {MessageListItemComponent} from '../message-list-item/message-list-item.component';

export const FLAVOR = 'flavor';
export const DESTINATION = 'destination';
export const TOPIC = 'topic';
export const TYPE = 'type';
export const QUALIFIER = 'qualifier';
export const PARAMS = 'params';
export const MESSAGE = 'message';
export const HEADERS = 'headers';
export const REQUEST_REPLY = 'request-reply';
export const RETAIN = 'retain';

enum MessagingFlavor {
  Topic = 'Topic', Intent = 'Intent',
}

@Component({
  selector: 'app-publish-message',
  templateUrl: './publish-message.component.html',
  styleUrls: ['./publish-message.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    NgFor,
    ReactiveFormsModule,
    SciFormFieldModule,
    SciParamsEnterModule,
    SciCheckboxModule,
    SciListModule,
    TopicSubscriberCountPipe,
    MessageListItemComponent,
  ],
})
export default class PublishMessageComponent implements OnDestroy {

  public FLAVOR = FLAVOR;
  public DESTINATION = DESTINATION;
  public TOPIC = TOPIC;
  public TYPE = TYPE;
  public QUALIFIER = QUALIFIER;
  public PARAMS = PARAMS;
  public MESSAGE = MESSAGE;
  public HEADERS = HEADERS;
  public REQUEST_REPLY = REQUEST_REPLY;
  public RETAIN = RETAIN;

  private _destroy$ = new Subject<void>();
  private _messageClient: MessageClient;
  private _intentClient: IntentClient;
  private _requestResponseSubscription: Subscription;

  public form: UntypedFormGroup;
  public replies: TopicMessage[] = [];
  public MessagingFlavor = MessagingFlavor;
  public publishError: string;
  public publishing: boolean;

  constructor(private _formBuilder: UntypedFormBuilder) {
    this._messageClient = Beans.get(MessageClient);
    this._intentClient = Beans.get(IntentClient);

    this.form = this._formBuilder.group({
      [FLAVOR]: new UntypedFormControl(MessagingFlavor.Topic, Validators.required),
      [DESTINATION]: this.createTopicDestinationFormGroup(),
      [MESSAGE]: new UntypedFormControl(''),
      [HEADERS]: this._formBuilder.array([]),
      [REQUEST_REPLY]: new UntypedFormControl(false),
      [RETAIN]: new UntypedFormControl(false),
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

  public onPublish(): void {
    this.isTopicFlavor() ? this.publishMessage() : this.publishIntent();
  }

  public isTopicFlavor(): boolean {
    return this.form.get(FLAVOR).value === MessagingFlavor.Topic;
  }

  public isRequestReply(): boolean {
    return this.form.get(REQUEST_REPLY).value;
  }

  public onClear(): void {
    this.replies.length = 0;
  }

  public onCancelPublish(): void {
    this.unsubscribe();
  }

  private unsubscribe(): void {
    this._requestResponseSubscription && this._requestResponseSubscription.unsubscribe();
    this._requestResponseSubscription = null;
    this.replies.length = 0;
  }

  private createIntentDestinationFormGroup(): UntypedFormGroup {
    return this._formBuilder.group({
      [TYPE]: this._formBuilder.control('', Validators.required),
      [QUALIFIER]: this._formBuilder.array([]),
      [PARAMS]: this._formBuilder.array([]),
    });
  }

  private createTopicDestinationFormGroup(): UntypedFormGroup {
    return this._formBuilder.group({
      [TOPIC]: new UntypedFormControl('', Validators.required),
    });
  }

  private publishMessage(): void {
    const topic = this.form.get(DESTINATION).get(TOPIC).value;
    const message = this.form.get(MESSAGE).value === '' ? undefined : this.form.get(MESSAGE).value;
    const requestReply = this.form.get(REQUEST_REPLY).value;
    const headers = SciParamsEnterComponent.toParamsMap(this.form.get(HEADERS) as UntypedFormArray);

    this.markPublishing(true);
    this.publishError = null;
    try {
      if (requestReply) {
        this._requestResponseSubscription = this._messageClient.request$(topic, message, {retain: this.form.get(RETAIN).value, headers})
          .pipe(finalize(() => this.markPublishing(false)))
          .subscribe({
            next: reply => this.replies.push(reply),
            error: error => this.publishError = error,
          });
      }
      else {
        this._messageClient.publish(topic, message, {retain: this.form.get(RETAIN).value, headers})
          .catch(error => {
            this.publishError = error?.message ?? `${error}`;
          })
          .finally(() => {
            this.markPublishing(false);
          });
      }
    }
    catch (error) {
      this.markPublishing(false);
      this.publishError = error;
    }
  }

  private publishIntent(): void {
    const type: string = this.form.get(DESTINATION).get(TYPE).value;
    const qualifier: Qualifier = SciParamsEnterComponent.toParamsDictionary(this.form.get(DESTINATION).get(QUALIFIER) as UntypedFormArray);
    const params: Map<string, any> = SciParamsEnterComponent.toParamsMap(this.form.get(DESTINATION).get(PARAMS) as UntypedFormArray);

    // Convert entered params to their actual values.
    params?.forEach((paramValue, paramName) => params.set(paramName, convertValueFromUI(paramValue)));

    const message = this.form.get(MESSAGE).value === '' ? undefined : this.form.get(MESSAGE).value;
    const requestReply = this.form.get(REQUEST_REPLY).value;
    const headers = SciParamsEnterComponent.toParamsMap(this.form.get(HEADERS) as UntypedFormArray);

    this.markPublishing(true);
    this.publishError = null;
    try {
      if (requestReply) {
        this._requestResponseSubscription = this._intentClient.request$({type, qualifier}, message, {retain: this.form.get(RETAIN).value, headers})
          .pipe(finalize(() => this.markPublishing(false)))
          .subscribe({
            next: reply => this.replies.push(reply),
            error: error => this.publishError = error,
          });
      }
      else {
        this._intentClient.publish({type, qualifier, params}, message, {retain: this.form.get(RETAIN).value, headers})
          .catch(error => {
            this.publishError = error?.message ?? `${error}`;
          })
          .finally(() => {
            this.markPublishing(false);
          });
      }
    }
    catch (error) {
      this.markPublishing(false);
      this.publishError = error;
    }
  }

  private markPublishing(publishing: boolean): void {
    publishing ? this.form.disable() : this.form.enable();
    this.publishing = publishing;
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this.unsubscribe();
  }
}

/**
 * Converts the value entered via the UI to its actual type.
 *
 * Examples:
 * - '<undefined>' => undefined
 * - '<null>' => null
 * - '<number>123</number>' => 123
 * - '<boolean>true</boolean>' => true
 * - '<string>value</string>' => 'value'
 * - '<json>{"key": "value"}</json>' => {"key": "value"}
 * - 'value' => 'value'
 */
function convertValueFromUI(value: string): string | number | boolean | object | undefined | null {
  if ('<undefined>' === value) {
    return undefined;
  }
  else if ('<null>' === value) {
    return null;
  }
  const paramMatch = value.match(/<(?<type>.+)>(?<value>.+)<\/\k<type>>/);
  switch (paramMatch?.groups['type']) {
    case 'number': {
      return coerceNumberProperty(paramMatch.groups['value']);
    }
    case 'boolean': {
      return coerceBooleanProperty(paramMatch.groups['value']);
    }
    case 'string': {
      return paramMatch.groups['value'];
    }
    case 'json': {
      return JSON.parse(paramMatch.groups['value']);
    }
    default: {
      return value;
    }
  }
}

