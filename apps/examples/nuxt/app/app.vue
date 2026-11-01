<script setup lang="ts">
import { ref } from 'vue';

const result = ref('');

function onSubmit(event: Event) {
  const form = event.currentTarget as HTMLFormElement;
  result.value = JSON.stringify(Object.fromEntries(new FormData(form)));
}
</script>

<template>
  <main style="padding: 32px; font-family: system-ui, sans-serif">
    <h1>SSR gate</h1>
    <form
      data-testid="form"
      style="display: grid; gap: 16px; max-width: 360px"
      @submit.prevent="onSubmit"
    >
      <neu-text-field data-testid="email" name="email" label="Email" type="email" value="a@b.co" />
      <neu-switch data-testid="notify" name="notify" checked>Notifications</neu-switch>
      <neu-button data-testid="save" type="submit" variant="primary">Save</neu-button>
      <pre data-testid="result">{{ result }}</pre>
    </form>
  </main>
  <!-- Teleported output reaches render:html outside the body chunk (e.g. a modal). -->
  <Teleport to="body">
    <aside style="padding: 0 32px 32px; font-family: system-ui, sans-serif">
      <neu-text-field data-testid="teleported" label="Teleported" />
    </aside>
  </Teleport>
</template>
