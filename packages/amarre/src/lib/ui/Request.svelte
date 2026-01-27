<script lang="ts">
  import { DateTime } from 'luxon';
  import CardItem from '$lib/ui/CardItem.svelte';

  let { request } = $props();

  let isInvitation = $derived(request.invite_nom !== '');
  let isVoyage = $derived(
    request.mobilite_universite_eunicoast !== '' ||
      request.mobilite_universite_gu8 !== '' ||
      request.mobilite_universite_autre !== ''
  );
  let isCategoryEnseignantChercheur = $derived(request.demandeur_statut === '1');
  let isCategoryEnseignant = $derived(request.demandeur_statut === '2');
  let isCategoryOther = $derived(
    request.demandeur_statut !== '' &&
      request.demandeur_statut !== '1' &&
      request.demandeur_statut !== '2'
  );
  let composanteValidation = $derived(request.demandeur_composante_complete === '2');
  let laboValidation = $derived(request.labo_complete === '2');
  let encadrantValidation = $derived(request.encadrant_complete === '2');
  let composanteShouldSign = $derived(
    isInvitation && (isCategoryEnseignantChercheur || isCategoryEnseignant)
  );
  let laboShouldSign = $derived(isCategoryEnseignantChercheur || isCategoryOther);
  let encadrantShouldSign = $derived(isCategoryOther && isVoyage);
  let finalValidationShouldSign = $derived.by(() => {
    if (composanteShouldSign && laboShouldSign) {
      return composanteValidation && laboValidation;
    } else if (laboShouldSign && encadrantShouldSign) {
      return laboValidation && encadrantValidation;
    } else if (composanteShouldSign) {
      return composanteValidation;
    } else if (laboShouldSign) {
      return laboValidation;
    } else {
      return false;
    }
  });
  let destination = $derived.by(() => {
    if (request.mobilite_universite_eunicoast !== '') {
      return request.mobilite_universite_eunicoast;
    } else if (request.mobilite_universite_gu8 !== '') {
      return request.mobilite_universite_gu8;
    } else if (request.mobilite_universite_autre !== '') {
      return request.mobilite_universite_autre;
    } else {
      return null;
    }
  });
</script>

<div class="flex-shrink-0">
  <CardItem>
    {#snippet title()}
      {#if isInvitation}
        Mon invitation de {request.invite_nom}
      {:else if isVoyage}Mon séjour à {destination}{:else}Ma nouvelle demande{/if}
    {/snippet}
    {#snippet description()}
      Ma demande {request.record_id} est en cours de traitement.
    {/snippet}
    {#snippet actions()}
      <div
        class="list-group-item list-group-item-{request.form_complete === '2'
          ? 'success'
          : 'warning'}"
      >
        {request.form_complete === '2'
          ? 'Mon formulaire est complet'
          : 'Je dois compléter mon formulaire'}.
      </div>
      {#if composanteShouldSign}
        <div
          class="list-group-item list-group-item-{request.form_complete !== '2'
            ? 'warning'
            : request.demandeur_composante_complete === '2'
              ? 'success'
              : 'info'}"
        >
          Ma composante {request.form_complete !== '2'
            ? 'attend mon formulaire'
            : request.demandeur_composante_complete === '2'
              ? 'a informé sa décision'
              : 'se concerte'}.
        </div>
      {/if}
      {#if laboShouldSign}
        <div
          class="list-group-item list-group-item-{request.form_complete !== '2'
            ? 'warning'
            : request.labo_complete === '2'
              ? 'success'
              : 'info'}"
        >
          Mon laboratoire {request.form_complete !== '2'
            ? 'attend mon formulaire'
            : request.labo_complete === '2'
              ? 'a informé sa décision'
              : 'se concerte'}.
        </div>
      {/if}
      {#if encadrantShouldSign}
        <div
          class="list-group-item list-group-item-{request.form_complete !== '2'
            ? 'warning'
            : request.encadrant_complete === '2'
              ? 'success'
              : 'info'}"
        >
          Mon encadrant {request.form_complete !== '2'
            ? 'attend mon formulaire'
            : request.encadrant_complete === '2'
              ? 'a informé sa décision'
              : 'se concerte'}.
        </div>
      {/if}
      <div
        class="list-group-item list-group-item-{request.form_complete !== '2'
          ? 'info'
          : request.validation_finale_complete === '2'
            ? 'success'
            : finalValidationShouldSign
              ? 'warning'
              : 'info'}"
      >
        {request.form_complete !== '2'
          ? "Ma validation finale n'est pas disponible tant que mon formulaire n'est pas complet et que toutes les parties prenantes n'ont pas pris de décision"
          : request.validation_finale_complete === '2'
            ? 'Ma validation finale est complète'
            : finalValidationShouldSign
              ? 'Je dois compléter ma validation finale'
              : "Je dois attendre la validation de toutes les parties prenantes avant d'effectuer ma validation finale"}.
      </div>
    {/snippet}
    {#snippet links()}
      {#if request.form_complete === '2'}
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        <a
          href="/api/v1/surveys/pdf?record_id={request.record_id}"
          class="card-link"
          download="formulaire_{request.record_id}.pdf">Formulaire</a
        >
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
      {:else if request.form}
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        <a href={request.form} class="card-link" target="_blank" rel="noopener noreferrer"
          >Formulaire</a
        >
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
      {:else}
        <span class="card-link text-body-secondary">Formulaire</span>
      {/if}
      {#if request.validation_finale_complete !== '2'}
        {#if finalValidationShouldSign && request.validation_finale}
          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <a
            href={request.validation_finale}
            class="card-link"
            target="_blank"
            rel="noopener noreferrer">Validation finale</a
          >
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {:else}
          <span class="card-link text-body-secondary">Validation finale</span>
        {/if}
      {/if}
    {/snippet}
    {#snippet footer()}
      <small class="text-body-secondary">
        Créée {DateTime.fromISO(request.created_at).toRelative({ locale: 'fr' })}
      </small>
    {/snippet}
  </CardItem>
</div>
