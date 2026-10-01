'use client';
import {
  attributeName,
  coerceProperty,
  renderShadowContents,
  serializeAttribute,
  type ComponentDef,
} from '@neu-ui/elements/ssr.js';
import * as React from 'react';

export type WrapperProps<K extends PropertyKey = never> = Omit<
  React.HTMLAttributes<HTMLElement>,
  K
> & {
  children?: React.ReactNode;
};

export interface WrapperConfig {
  /** React prop name → DOM event name, e.g. { onChange: 'change' }. */
  readonly events?: Readonly<Record<string, string>>;
}

interface ElementClass<E extends HTMLElement> {
  readonly def: ComponentDef;
  new (): E;
}

const isServer = typeof window === 'undefined';
const useIsomorphicLayoutEffect = isServer ? React.useEffect : React.useLayoutEffect;
const needsClassAttribute = Number.parseInt(React.version, 10) < 19;

export function createComponent<P extends object, E extends HTMLElement>(
  elementClass: ElementClass<E>,
  config: WrapperConfig = {},
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<E>> {
  const def = elementClass.def;
  const events = config.events ?? {};
  const valueProp = def.form?.valueProp;
  const defaultProp =
    valueProp === 'checked' ? 'defaultChecked' : valueProp === 'value' ? 'defaultValue' : undefined;
  const elementKeys = new Set(Object.keys(def.props));
  if (defaultProp) elementKeys.add(defaultProp);

  const Wrapper = React.forwardRef<E, P>(function NeuWrapper(props, forwardedRef) {
    const elementRef = React.useRef<E | null>(null);
    const { children, ...rest } = props as unknown as Record<string, unknown> & {
      children?: React.ReactNode;
    };

    const host: Record<string, unknown> = {};
    const element: Record<string, unknown> = {};
    const handlers: Record<string, (event: Event) => void> = {};
    for (const [key, value] of Object.entries(rest)) {
      const eventName = Object.hasOwn(events, key) ? events[key] : undefined;
      if (eventName !== undefined) {
        if (typeof value === 'function') handlers[eventName] = value as (event: Event) => void;
      } else if (elementKeys.has(key)) {
        element[key] = value;
      } else {
        host[key] = value;
      }
    }
    if (needsClassAttribute && 'className' in host) {
      host.class = host.className;
      delete host.className;
    }

    const latest = React.useRef(element);
    latest.current = element;
    const handlersRef = React.useRef(handlers);
    handlersRef.current = handlers;
    const applied = React.useRef(new Set<string>());

    // Properties after every commit. Defaults go first so a controlled value set in the same pass wins.
    useIsomorphicLayoutEffect(() => {
      const node = elementRef.current as unknown as Record<string, unknown> | null;
      if (!node) return;
      for (const key of applied.current) {
        if (element[key] === undefined) node[key] = undefined;
      }
      const next = new Set<string>();
      const keys = Object.keys(element).sort(
        (a, b) => Number(b === defaultProp) - Number(a === defaultProp),
      );
      for (const key of keys) {
        const value = element[key];
        if (value === undefined) continue;
        next.add(key);
        if (node[key] !== value) node[key] = value;
      }
      applied.current = next;
    });

    const eventNames = Object.keys(handlers).sort().join(' ');
    useIsomorphicLayoutEffect(() => {
      const node = elementRef.current;
      if (!node) return;
      const names = new Set(eventNames === '' ? [] : eventNames.split(' '));
      if (valueProp) {
        names.add('input');
        names.add('change');
      }
      const listener = (event: Event) => {
        if (event.target !== node) return;
        handlersRef.current[event.type]?.(event);
        if (!valueProp) return;
        // Controlled: once React has had a chance to re-render, snap back to the prop.
        queueMicrotask(() => {
          const wanted = latest.current[valueProp];
          const current = elementRef.current as unknown as Record<string, unknown> | null;
          if (current && wanted !== undefined && current[valueProp] !== wanted) {
            current[valueProp] = wanted;
          }
        });
      };
      for (const name of names) node.addEventListener(name, listener);
      return () => {
        for (const name of names) node.removeEventListener(name, listener);
      };
    }, [eventNames]);

    const setRef = React.useCallback(
      (node: E | null) => {
        elementRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const serverAttributes: Record<string, string> = {};
    let template: React.ReactElement | null = null;
    if (isServer) {
      for (const [key, decl] of Object.entries(def.props)) {
        const raw =
          key === valueProp && element[key] === undefined && defaultProp
            ? element[defaultProp]
            : element[key];
        if (raw === undefined) continue;
        const attribute = serializeAttribute(decl, coerceProperty(decl, raw));
        if (attribute !== null) serverAttributes[attributeName(key, decl)] = attribute;
      }
      const templateProps: Record<string, unknown> = {
        shadowrootmode: 'open',
        dangerouslySetInnerHTML: { __html: renderShadowContents(def, serverAttributes) },
      };
      if (def.delegatesFocus) templateProps.shadowrootdelegatesfocus = '';
      template = React.createElement('template', templateProps);
    }

    const hostProps: Record<string, unknown> = {
      ...host,
      ...serverAttributes,
      ref: setRef,
      suppressHydrationWarning: true,
    };
    return React.createElement(def.tag, hostProps, template, children);
  });

  Wrapper.displayName = def.tag;
  return Wrapper as unknown as React.ForwardRefExoticComponent<
    React.PropsWithoutRef<P> & React.RefAttributes<E>
  >;
}
