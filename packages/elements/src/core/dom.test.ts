import { afterEach, describe, expect, test } from 'vitest';
import { afterDispatch, isActiveInRoot } from './dom.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('afterDispatch', () => {
  test('runs once every listener has seen the event, window included, before dispatch returns', async () => {
    const el = document.body.appendChild(document.createElement('div'));
    const order: string[] = [];
    const onWindow = () => order.push('window');
    window.addEventListener('ping', onWindow);
    try {
      el.addEventListener('ping', (event) => {
        order.push('target');
        afterDispatch(event, () => order.push('run'));
      });
      document.addEventListener('ping', () => order.push('document'), { once: true });
      el.dispatchEvent(new Event('ping', { bubbles: true }));
      expect(order).toEqual(['target', 'document', 'window', 'run']);
      await tick();
      expect(order).toEqual(['target', 'document', 'window', 'run']);
    } finally {
      window.removeEventListener('ping', onWindow);
    }
  });

  test('sees a preventDefault from a listener further up', () => {
    const el = document.body.appendChild(document.createElement('div'));
    let prevented: boolean | undefined;
    el.addEventListener('ping', (event) => {
      afterDispatch(event, () => (prevented = event.defaultPrevented));
    });
    document.body.addEventListener('ping', (event) => event.preventDefault(), { once: true });
    el.dispatchEvent(new Event('ping', { bubbles: true, cancelable: true }));
    expect(prevented).toBe(true);
  });

  test('runs on the next task, once, when the event never reaches window', async () => {
    const el = document.body.appendChild(document.createElement('div'));
    let runs = 0;
    el.addEventListener('ping', (event) => {
      afterDispatch(event, () => runs++);
      event.stopPropagation();
    });
    el.dispatchEvent(new Event('ping', { bubbles: true }));
    el.dispatchEvent(new Event('ping', { bubbles: false }));
    expect(runs).toBe(0);
    await tick();
    expect(runs).toBe(2);
    await tick();
    expect(runs).toBe(2);
  });

  test('ignores another event of the same type that reaches window first', () => {
    const outer = document.body.appendChild(document.createElement('div'));
    const inner = document.body.appendChild(document.createElement('div'));
    const order: string[] = [];
    outer.addEventListener('ping', (event) => {
      afterDispatch(event, () => order.push('run'));
      inner.dispatchEvent(new Event('ping', { bubbles: true }));
      order.push('nested done');
    });
    outer.dispatchEvent(new Event('ping', { bubbles: true }));
    expect(order).toEqual(['nested done', 'run']);
  });
});

describe('isActiveInRoot', () => {
  test('is true for the active element of its own tree, inside a shadow root too', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const inner = host.attachShadow({ mode: 'open' }).appendChild(document.createElement('button'));
    const outer = document.body.appendChild(document.createElement('button'));
    expect([isActiveInRoot(inner), isActiveInRoot(outer)]).toEqual([false, false]);
    inner.focus();
    // The document sees the host as its active element; the shadow root sees the inner button.
    expect([isActiveInRoot(inner), isActiveInRoot(host), isActiveInRoot(outer)]).toEqual([
      true,
      true,
      false,
    ]);
    outer.focus();
    expect([isActiveInRoot(inner), isActiveInRoot(outer)]).toEqual([false, true]);
  });
});
