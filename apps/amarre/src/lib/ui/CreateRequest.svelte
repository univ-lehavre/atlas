<script lang="ts">
  import { PUBLIC_RGPD_NOTICE_URL } from '$env/static/public';

  let consent = $state(false);
</script>

<div
  class="modal fade"
  id="CreateRequest"
  tabindex="-1"
  aria-labelledby="CreateRequestLabel"
  aria-hidden="true"
>
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="CreateRequestLabel">
          Traitement des données à caractère personnel
        </h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>
          Avant de créer une nouvelle demande, je confirme avoir pris connaissance du <a
            href={PUBLIC_RGPD_NOTICE_URL}
            target="_blank"
            rel="noopener noreferrer">formulaire</a
          > d’informations RGPD de la plateforme AMARRE.
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
          <span class="input-group-text" id="basic-addon1">Je donne mon consentement</span>
          <button type="submit" class="btn btn-primary {consent ? '' : 'disabled'}">
            Créer une demande</button
          >
        </form>
      </div>
    </div>
  </div>
</div>
