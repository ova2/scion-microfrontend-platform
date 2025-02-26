/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {ClientRegistry} from '../client-registry/client.registry';
import {Beans} from '@scion/toolkit/bean-manager';
import {Client} from '../client-registry/client';
import {noop} from 'rxjs';
import {UUID} from '@scion/toolkit/uuid';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {ɵClientRegistry} from '../client-registry/ɵclient.registry';
import {MessageSubscription, MessageSubscriptionRegistry} from './message-subscription.registry';
import {ɵApplication} from '../../ɵplatform.model';

describe('MessageSubscriptionRegistry', () => {

  beforeEach(async () => {
    Beans.destroy();
    Beans.register(MessageSubscriptionRegistry);
    Beans.register(ClientRegistry, {useClass: ɵClientRegistry});
    await Beans.start();
  });

  afterEach(() => Beans.destroy());

  it('should remove subscriptions when unregistering a client', async () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1'});
    const client2 = newClient({id: 'client#2'});

    const subscription1 = new MessageSubscription('subscriber#1', client1);
    const subscription2 = new MessageSubscription('subscriber#2', client1);
    const subscription3 = new MessageSubscription('subscriber#3', client2);
    const subscription4 = new MessageSubscription('subscriber#4', client2);

    testee.register(subscription1);
    testee.register(subscription2);
    testee.register(subscription3);
    testee.register(subscription4);

    // WHEN unregistering client 1
    Beans.get(ClientRegistry).unregisterClient(client1);
    expect(testee.subscriptions()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#3'}),
      jasmine.objectContaining({subscriberId: 'subscriber#4'}),
    ]);
    await expectAsync(subscription1.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBePending();
    await expectAsync(subscription4.whenUnsubscribe).toBePending();

    // WHEN unregistering client 2
    Beans.get(ClientRegistry).unregisterClient(client2);
    expect(testee.subscriptions()).toEqual([]);
    await expectAsync(subscription1.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription4.whenUnsubscribe).toBeResolved();
  });

  it('should remove subscription by client', async () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1'});
    const client2 = newClient({id: 'client#2'});

    const subscription1 = new MessageSubscription('subscriber#1', client1);
    const subscription2 = new MessageSubscription('subscriber#2', client1);
    const subscription3 = new MessageSubscription('subscriber#3', client2);
    const subscription4 = new MessageSubscription('subscriber#4', client2);

    testee.register(subscription1);
    testee.register(subscription2);
    testee.register(subscription3);
    testee.register(subscription4);

    // WHEN unregistering subscriptions of client 1
    testee.unregister({clientId: client1.id});
    expect(testee.subscriptions()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#3'}),
      jasmine.objectContaining({subscriberId: 'subscriber#4'}),
    ]);
    await expectAsync(subscription1.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBePending();
    await expectAsync(subscription4.whenUnsubscribe).toBePending();

    // WHEN unregistering subscriptions of client 2
    testee.unregister({clientId: client2.id});
    expect(testee.subscriptions()).toEqual([]);
    await expectAsync(subscription1.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription4.whenUnsubscribe).toBeResolved();
  });

  it('should remove subscription by id', async () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1'});
    const client2 = newClient({id: 'client#2'});

    const subscription1 = new MessageSubscription('subscriber#1', client1);
    const subscription2 = new MessageSubscription('subscriber#2', client1);
    const subscription3 = new MessageSubscription('subscriber#3', client2);

    testee.register(subscription1);
    testee.register(subscription2);
    testee.register(subscription3);

    // WHEN unregistering subscription 2
    testee.unregister({subscriberId: 'subscriber#2'});
    expect(testee.subscriptions()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
      jasmine.objectContaining({subscriberId: 'subscriber#3'}),
    ]);
    await expectAsync(subscription1.whenUnsubscribe).toBePending();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBePending();

    // WHEN unregistering subscription 3 (wrong client)
    testee.unregister({subscriberId: 'subscriber#3', clientId: client1.id});
    expect(testee.subscriptions()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
      jasmine.objectContaining({subscriberId: 'subscriber#3'}),
    ]);
    await expectAsync(subscription1.whenUnsubscribe).toBePending();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBePending();

    // WHEN unregistering subscription 3
    testee.unregister({subscriberId: 'subscriber#3', clientId: client2.id});
    expect(testee.subscriptions()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
    ]);
    await expectAsync(subscription1.whenUnsubscribe).toBePending();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBeResolved();
  });

  it('should emit when registering a subscription', () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client = newClient({id: 'client#1'});

    const registerCaptor = new ObserveCaptor();
    testee.register$.subscribe(registerCaptor);

    // WHEN registering a subscription
    testee.register(new MessageSubscription('subscriber#1', client));
    expect(registerCaptor.getValues()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
    ]);
    registerCaptor.reset();

    // WHEN registering a subscription
    testee.register(new MessageSubscription('subscriber#2', client));
    expect(registerCaptor.getValues()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#2'}),
    ]);
    registerCaptor.reset();
  });

  it('should emit when unregistering a subscription', async() => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1'});
    const client2 = newClient({id: 'client#2'});

    const unregisterCaptor = new ObserveCaptor();
    testee.unregister$.subscribe(unregisterCaptor);

    const subscription1 = new MessageSubscription('subscriber#1', client1);
    const subscription2 = new MessageSubscription('subscriber#2', client1);
    const subscription3 = new MessageSubscription('subscriber#3', client2);
    const subscription4 = new MessageSubscription('subscriber#4', client2);

    testee.register(subscription1);
    testee.register(subscription2);
    testee.register(subscription3);
    testee.register(subscription4);

    // WHEN unregistering subscription 4
    testee.unregister({subscriberId: 'subscriber#4'});
    expect(unregisterCaptor.getValues().length).toEqual(1);
    await expectAsync(subscription1.whenUnsubscribe).toBePending();
    await expectAsync(subscription2.whenUnsubscribe).toBePending();
    await expectAsync(subscription3.whenUnsubscribe).toBePending();
    await expectAsync(subscription4.whenUnsubscribe).toBeResolved();
    unregisterCaptor.reset();

    // WHEN unregistering subscriptions of client 1
    testee.unregister({clientId: client1.id});
    expect(unregisterCaptor.getValues().length).toEqual(1);
    await expectAsync(subscription1.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBePending();
    await expectAsync(subscription4.whenUnsubscribe).toBeResolved();
    unregisterCaptor.reset();

    // WHEN unregistering subscriptions of client 2
    testee.unregister({clientId: client2.id});
    expect(unregisterCaptor.getValues().length).toEqual(1);
    await expectAsync(subscription1.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription2.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription3.whenUnsubscribe).toBeResolved();
    await expectAsync(subscription4.whenUnsubscribe).toBeResolved();
    unregisterCaptor.reset();
  });

  it('should return subscriptions', () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client = newClient({id: 'client#1'});

    testee.register(new MessageSubscription('subscriber#1', client));
    testee.register(new MessageSubscription('subscriber#2', client));

    expect(testee.subscriptions()).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
      jasmine.objectContaining({subscriberId: 'subscriber#2'}),
    ]);
  });

  it('should filter subscriptions by id', () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client = newClient({id: 'client#1'});

    testee.register(new MessageSubscription('subscriber#1', client));
    testee.register(new MessageSubscription('subscriber#2', client));

    expect(testee.subscriptions({subscriberId: 'subscriber#1'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
    ]);
    expect(testee.subscriptions({subscriberId: 'subscriber#2'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#2'}),
    ]);
  });

  it('should filter subscriptions by client', () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1'});
    const client2 = newClient({id: 'client#2'});

    testee.register(new MessageSubscription('subscriber#1', client1));
    testee.register(new MessageSubscription('subscriber#2', client1));
    testee.register(new MessageSubscription('subscriber#3', client2));
    testee.register(new MessageSubscription('subscriber#4', client2));

    expect(testee.subscriptions({clientId: client1.id})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
      jasmine.objectContaining({subscriberId: 'subscriber#2'}),
    ]);
    expect(testee.subscriptions({clientId: client2.id})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#3'}),
      jasmine.objectContaining({subscriberId: 'subscriber#4'}),
    ]);
  });

  it('should filter subscriptions by application', () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1', appSymbolicName: 'app1'});
    const client2 = newClient({id: 'client#2', appSymbolicName: 'app1'});
    const client3 = newClient({id: 'client#3', appSymbolicName: 'app2'});
    const client4 = newClient({id: 'client#4', appSymbolicName: 'app2'});

    testee.register(new MessageSubscription('subscriber#1', client1));
    testee.register(new MessageSubscription('subscriber#2', client1));
    testee.register(new MessageSubscription('subscriber#3', client2));
    testee.register(new MessageSubscription('subscriber#4', client2));
    testee.register(new MessageSubscription('subscriber#5', client3));
    testee.register(new MessageSubscription('subscriber#6', client3));
    testee.register(new MessageSubscription('subscriber#7', client4));
    testee.register(new MessageSubscription('subscriber#8', client4));

    expect(testee.subscriptions({appSymbolicName: 'app1'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
      jasmine.objectContaining({subscriberId: 'subscriber#2'}),
      jasmine.objectContaining({subscriberId: 'subscriber#3'}),
      jasmine.objectContaining({subscriberId: 'subscriber#4'}),
    ]);
    expect(testee.subscriptions({appSymbolicName: 'app2'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#5'}),
      jasmine.objectContaining({subscriberId: 'subscriber#6'}),
      jasmine.objectContaining({subscriberId: 'subscriber#7'}),
      jasmine.objectContaining({subscriberId: 'subscriber#8'}),
    ]);
  });

  it('should AND together filter criteria', () => {
    const testee = Beans.get(MessageSubscriptionRegistry);
    const client1 = newClient({id: 'client#1', appSymbolicName: 'app1'});
    const client2 = newClient({id: 'client#2', appSymbolicName: 'app1'});
    const client3 = newClient({id: 'client#3', appSymbolicName: 'app2'});
    const client4 = newClient({id: 'client#4', appSymbolicName: 'app2'});

    testee.register(new MessageSubscription('subscriber#1', client1));
    testee.register(new MessageSubscription('subscriber#2', client1));
    testee.register(new MessageSubscription('subscriber#3', client2));
    testee.register(new MessageSubscription('subscriber#4', client2));
    testee.register(new MessageSubscription('subscriber#5', client3));
    testee.register(new MessageSubscription('subscriber#6', client3));
    testee.register(new MessageSubscription('subscriber#7', client4));
    testee.register(new MessageSubscription('subscriber#8', client4));

    expect(testee.subscriptions({clientId: client1.id, appSymbolicName: 'app1'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
      jasmine.objectContaining({subscriberId: 'subscriber#2'}),
    ]);
    expect(testee.subscriptions({subscriberId: 'subscriber#1', clientId: client1.id, appSymbolicName: 'app1'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
    ]);
    expect(testee.subscriptions({subscriberId: 'subscriber#1', clientId: client1.id})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#1'}),
    ]);
    expect(testee.subscriptions({clientId: client3.id, appSymbolicName: 'app2'})).toEqual([
      jasmine.objectContaining({subscriberId: 'subscriber#5'}),
      jasmine.objectContaining({subscriberId: 'subscriber#6'}),
    ]);
    expect(testee.subscriptions({subscriberId: 'subscriber#1', clientId: client1.id, appSymbolicName: 'app2'})).toEqual([]);
    expect(testee.subscriptions({subscriberId: 'subscriber#7', clientId: client1.id})).toEqual([]);
    expect(testee.subscriptions({clientId: client1.id, appSymbolicName: 'app2'})).toEqual([]);
  });
});

function newClient(descriptor: {id: string; appSymbolicName?: string}): Client {
  return new class implements Partial<Client> {
    public readonly id = descriptor.id ?? UUID.randomUUID();
    public readonly application = {symbolicName: descriptor.appSymbolicName} as ɵApplication;
    public readonly dispose = noop;
  } as Client;
}

