/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {ChangeDetectorRef, Component, OnDestroy, ViewChild} from '@angular/core';
import {takeUntil} from 'rxjs/operators';
import {fromEvent, merge, Subject} from 'rxjs';
import {DatePipe, NgFor} from '@angular/common';
import {SciViewportComponent, SciViewportModule} from '@scion/components/viewport';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {SciCheckboxModule} from '@scion/components.internal/checkbox';

@Component({
  selector: 'app-mouse-event-dispatch-test-page',
  templateUrl: './mouse-event-dispatch-test-page.component.html',
  styleUrls: ['./mouse-event-dispatch-test-page.component.scss'],
  standalone: true,
  imports: [
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    SciViewportModule,
    SciCheckboxModule,
  ],
})
export default class MouseEventDispatchTestPageComponent implements OnDestroy {

  private _destroy$ = new Subject<void>();

  public dispatchedEvents = new Array<DispatchedEvent>();
  public followTailFormControl = new FormControl<boolean>(true);

  @ViewChild(SciViewportComponent)
  private _viewport: SciViewportComponent;

  constructor(private _cd: ChangeDetectorRef) {
    merge(fromEvent(document, 'sci-mousemove'), fromEvent(document, 'sci-mouseup'))
      .pipe(takeUntil(this._destroy$))
      .subscribe(event => {
        this.dispatchedEvents.push({type: event.type, timestamp: Date.now()});
        if (this.followTailFormControl.value) {
          this._cd.detectChanges();
          this._viewport.scrollTop = this._viewport.scrollHeight;
        }
      });
  }

  public onClearDispatchedEvent(): void {
    this.dispatchedEvents.length = 0;
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }
}

export interface DispatchedEvent {
  type: string;
  timestamp: number;
}
