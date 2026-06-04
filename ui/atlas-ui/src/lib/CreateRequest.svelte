<script lang="ts">
  import { modalInert } from "./modal-inert.js";

  interface Props {
    /** RGPD notice URL the consumer app reads from its own env (e.g. PUBLIC_RGPD_NOTICE_URL). */
    rgpdUrl: string;
    /** Name of the platform shown in the RGPD notice sentence. */
    platformName: string;
  }
  let { rgpdUrl, platformName }: Props = $props();

  let consent = $state(false);
</script>

<div
  class="modal fade"
  id="CreateRequest"
  tabindex="-1"
  aria-labelledby="CreateRequestLabel"
  inert
  use:modalInert
>
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="CreateRequestLabel">
          Traitement des données à caractère personnel
        </h1>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        ></button>
      </div>
      <div class="modal-body">
        <p>
          Avant de créer une nouvelle demande, je confirme avoir pris
          connaissance du <a
            href={rgpdUrl}
            target="_blank"
            rel="noopener noreferrer">formulaire</a
          >
          d’informations RGPD de la plateforme {platformName}.
        </p>
        <form method="post" action="?/newSurvey" class="input-group mb-3">
          <div class="input-group-text">
            <input
              class="form-check-input mt-0"
              type="checkbox"
              value=""
              aria-label="Checkbox for following text input"
              bind:checked={consent}
            />
          </div>
          <span class="input-group-text" id="basic-addon1"
            >Je donne mon consentement</span
          >
          <button
            type="submit"
            class="btn btn-primary {consent ? '' : 'disabled'}"
          >
            Créer une demande</button
          >
        </form>
      </div>
    </div>
  </div>
</div>
