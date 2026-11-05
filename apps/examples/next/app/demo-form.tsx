'use client';
import { NeuButton, NeuSwitch, NeuTextField } from '@neumorphism-ui/react';
import { useState, type FormEvent } from 'react';

export function DemoForm() {
  const [result, setResult] = useState('');
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
  }
  return (
    <form
      data-testid="form"
      onSubmit={onSubmit}
      style={{ display: 'grid', gap: 16, maxWidth: 360 }}
    >
      <NeuTextField
        data-testid="email"
        name="email"
        label="Email"
        type="email"
        defaultValue="a@b.co"
      />
      <NeuSwitch data-testid="notify" name="notify" defaultChecked>
        Notifications
      </NeuSwitch>
      <NeuButton data-testid="save" type="submit" variant="primary">
        Save
      </NeuButton>
      <pre data-testid="result">{result}</pre>
    </form>
  );
}
