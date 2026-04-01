<script lang="ts">
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
          Consentement sur mes données personnelles
        </h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>
          <span class="text-danger text-uppercase">
            Avant de créer une nouvelle demande, je confirme avoir lu et compris la politique de
            gestion des données personnelles.
          </span>
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
