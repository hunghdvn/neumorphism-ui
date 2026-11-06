'use client';
import {
  attributeName,
  coerceProperty,
  formDefaultProp,
  optionLabel,
  renderShadowContents,
  serializeAttribute,
  type ComponentDef,
  type OptionData,
} from '@neumorphism-ui/elements/ssr.js';
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

type Handler = (event: Event) => void;

interface ElementClass<E extends HTMLElement> {
  readonly def: ComponentDef;
  new (): E;
}

const isServer = typeof window === 'undefined';
const useIsomorphicLayoutEffect = isServer ? React.useEffect : React.useLayoutEffect;
const needsClassAttribute = Number.parseInt(React.version, 10) < 19;

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node))
    return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
}

/**
 * Option elements among the children at any depth, as the client reads them, looking through
 * fragments, arrays and plain elements (spec §8.4). A component other than the option wrapper may
 * render options the server cannot see, so meeting one returns no options at all: the select then
 * leaves its display empty for the client to fill rather than guessing from part of the list.
 */
function collectOptions(children: React.ReactNode, optionTag: string): OptionData[] {
  const options: OptionData[] = [];
  let complete = true;
  const walk = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as Record<string, unknown> & { children?: React.ReactNode };
      const type = child.type as string | { displayName?: string };
      const isOption =
        type === optionTag || (typeof type !== 'string' && type?.displayName === optionTag);
      if (!isOption) {
        if (child.type === React.Fragment || typeof type === 'string') walk(props.children);
        else complete = false;
        return;
      }
      const label = optionLabel(textOf(props.children));
      options.push({
        value: props.value === undefined || props.value === null ? label : String(props.value),
        label,
        disabled: !!props.disabled,
      });
    });
  };
  walk(children);
  return complete ? options : [];
}

export function createComponent<P extends object, E extends HTMLElement>(
  elementClass: ElementClass<E>,
  config: WrapperConfig = {},
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<E>> {
  const def = elementClass.def;
  const events = config.events ?? {};
  const valueProp = def.form?.valueProp;
  const defaultProp = formDefaultProp(def);
  const elementKeys = new Set([...Object.keys(def.props), ...Object.keys(def.properties ?? {})]);
  if (defaultProp) elementKeys.add(defaultProp);

  const Wrapper = React.forwardRef<E, P>(function NeuWrapper(props, forwardedRef) {
    const elementRef = React.useRef<E | null>(null);
    const { children, ...rest } = props as unknown as Record<string, unknown> & {
      children?: React.ReactNode;
    };

    const host: Record<string, unknown> = {};
    const element: Record<string, unknown> = {};
    // Several props may share one DOM event (onInput and onChange on a text field); they run in
    // the order of the wrapper's event map.
    const handlers: Record<string, Handler[]> = {};
    for (const [key, eventName] of Object.entries(events)) {
      const value = rest[key];
      if (typeof value === 'function') (handlers[eventName] ??= []).push(value as Handler);
    }
    for (const [key, value] of Object.entries(rest)) {
      if (Object.hasOwn(events, key)) continue;
      if (elementKeys.has(key)) {
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

    // Properties after every commit. Defaults go first so a controlled value set in the same pass
    // wins, and the value goes last so min, max and step are in place when it is clamped (as
    // ReactDOM orders a native range input).
    useIsomorphicLayoutEffect(() => {
      const node = elementRef.current as unknown as Record<string, unknown> | null;
      if (!node) return;
      const absent = (key: string) =>
        element[key] === undefined || (key === defaultProp && element[key] === null);
      for (const key of applied.current) {
        if (!absent(key)) continue;
        if (key === defaultProp && valueProp) {
          // The element's default setter would stringify undefined; drop the attribute instead.
          (node as unknown as Element).removeAttribute(
            attributeName(valueProp, def.props[valueProp]!),
          );
        } else {
          node[key] = undefined;
        }
      }
      const next = new Set<string>();
      const rank = (key: string) => (key === defaultProp ? 0 : key === valueProp ? 2 : 1);
      const keys = Object.keys(element).sort((a, b) => rank(a) - rank(b));
      for (const key of keys) {
        const value = element[key];
        if (absent(key)) continue;
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
        for (const handler of handlersRef.current[event.type] ?? []) handler(event);
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
        dangerouslySetInnerHTML: {
          __html: def.optionsFrom
            ? renderShadowContents(def, serverAttributes, {
                options: collectOptions(children, def.optionsFrom),
              })
            : renderShadowContents(def, serverAttributes),
        },
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
