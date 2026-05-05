# Sections de code couvrant l'API REDCap

Ce dossier contient les sources REDCap par version sous forme d'archives zip dans
`source/`. Les chemins ci-dessous sont donc les chemins internes des archives,
par exemple `source/redcap17.0.5.zip`.

## Vue d'ensemble

L'API REDCap est structurée en trois couches principales :

1. des points d'entree publics non versionnes sous `redcap/api/` ;
2. un routeur principal versionne sous `redcap/redcap_v*/API/index.php` ;
3. des implementations par couple `content` / `action` sous
   `redcap/redcap_v*/API/{content}/{action}.php`.

Pour analyser ou generer une specification OpenAPI, les fichiers prioritaires
sont :

- `redcap/api/index.php`
- `redcap/api/help/index.php`
- `redcap/redcap_v*/API/index.php`
- `redcap/redcap_v*/API/help.php`
- `redcap/redcap_v*/API/{content}/{action}.php`
- `redcap/redcap_v*/Classes/RestUtility.php`

## Points d'entree publics

### `redcap/api/index.php`

Ce fichier est le point d'entree public pour les appels API. Dans REDCap
`17.0.5`, les lignes 4-9 :

- definissent `REDCAP_CONNECT_NONVERSIONED` ;
- chargent `redcap_connect.php` ;
- deleguent vers le routeur versionne
  `redcap/redcap_v{$redcap_version}/API/index.php`.

### `redcap/api/help/index.php`

Ce fichier est le point d'entree public de la documentation API. Dans REDCap
`17.0.5`, les lignes 4-9 :

- definissent `REDCAP_CONNECT_NONVERSIONED` ;
- chargent `redcap_connect.php` ;
- deleguent vers `redcap/redcap_v{$redcap_version}/API/help.php`.

## Routeur principal

### `redcap/redcap_v*/API/index.php`

Ce fichier est le coeur de l'API. Il normalise la requete, valide les parametres,
verifie les droits, puis inclut le fichier d'implementation correspondant.

Dans REDCap `17.0.5`, les sections importantes sont :

- lignes 6-80 : distinction entre API standard, External Modules et MyCap ;
- lignes 100-147 : formats acceptes (`xml`, `json`, `csv`, `odm`) et
  `returnFormat` ;
- lignes 149-150 : verification globale de `$api_enabled` ;
- lignes 152-210 : API External Modules via `content=externalModule` ;
- lignes 213-228 : traitement de la requete et du token ;
- lignes 269-317 : liste blanche des valeurs acceptees pour `content` ;
- lignes 319-411 : resolution et validation de `action` ;
- lignes 413-458 : verification des droits API
  (`api_export`, `api_import`, suppression, renommage, randomisation) ;
- lignes 489-499 : hook `redcap_module_api_before`, puis dispatch final vers
  `API/{content}/{action}.php`.

La ligne cle du dispatch est :

```php
include ($post['content'] . "/$action.php");
```

## Parsing, authentification et reponses

### `redcap/redcap_v*/Classes/RestUtility.php`

Cette classe porte la logique transversale de l'API.

Dans REDCap `17.0.5`, les sections importantes sont :

- lignes 59-209 : `processRequest()`
  - accepte uniquement les requetes `POST` pour l'API standard ;
  - valide le token ;
  - charge les droits utilisateur/projet ;
  - enrichit les donnees de requete avec les droits calcules ;
  - decode les donnees importees selon `format` (`json`, `xml`, `csv`).
- lignes 219 et suivantes : `sendResponse()`
  - applique le statut HTTP ;
  - choisit le type de contenu (`application/json`, `text/csv`, `text/xml`) ;
  - formate les erreurs selon `returnFormat`.

## Documentation API

### `redcap/redcap_v*/API/help.php`

Ce fichier genere la documentation HTML de l'API REDCap. Il est utile pour
extraire les parametres attendus, les permissions necessaires et les exemples.

Dans REDCap `17.0.5` :

- lignes 49-51 : selection de la page de documentation via `$_GET['content']` ;
- ligne 129 : suppression de records (`del_records`) ;
- ligne 161 : renommage de record (`rename_record`) ;
- ligne 190 : randomisation (`randomize`) ;
- ligne 239 : export de records (`exp_records`) ;
- ligne 308 : export de rapports (`exp_reports`) ;
- ligne 343 : import de records (`imp_records`) ;
- ligne 416 : export de metadata (`exp_metadata`) ;
- ligne 445 : import de metadata (`imp_metadata`) ;
- ligne 473 : export de noms de champs (`exp_field_names`) ;
- ligne 502 : export de fichier (`exp_file`) ;
- ligne 534 : import de fichier (`imp_file`) ;
- ligne 564 : suppression de fichier (`del_file`) ;
- lignes 593-709 : operations du File Repository ;
- ligne 735 : export des instruments (`exp_instr`) ;
- lignes 759-783 : repeating forms/events ;
- ligne 812 : export PDF d'instruments ;
- lignes 844-961 : liens, codes et participants de survey ;
- lignes 990-1043 : export/import/delete events ;
- lignes 1106-1191 : arms ;
- lignes 1219-1328 : Data Access Groups ;
- lignes 1353-1465 : mappings utilisateur/DAG et instrument/event ;
- lignes 1533-1562 : export/import utilisateurs ;
- ligne 1638 : import des parametres projet ;
- ligne 1666 : export XML projet ;
- ligne 1701 : prochain record id ;
- lignes 1727-1755 : export/import projet ;
- ligne 1805 : version REDCap ;
- ligne 1830 : logs ;
- lignes 1864-2045 : utilisateurs, roles et mappings de roles.

## Implementations par endpoint

Les implementations se trouvent sous :

```text
redcap/redcap_v*/API/{content}/{action}.php
```

Dans REDCap `17.0.5`, les couples `content/action` presents sont :

- `appRightsCheck/export.php`
- `arm/export.php`, `arm/import.php`, `arm/delete.php`
- `attachment/export.php`
- `authkey/export.php`
- `dag/export.php`, `dag/import.php`, `dag/delete.php`, `dag/switch.php`
- `event/export.php`, `event/import.php`, `event/delete.php`
- `exportFieldNames/export.php`
- `fieldValidation/export.php`
- `file/export.php`, `file/import.php`, `file/import_app.php`, `file/delete.php`
- `fileRepository/export.php`, `fileRepository/import.php`,
  `fileRepository/delete.php`, `fileRepository/createFolder.php`,
  `fileRepository/list.php`
- `formEventMapping/export.php`, `formEventMapping/import.php`
- `generateNextRecordName/export.php`
- `instrument/export.php`
- `log/export.php`
- `metadata/export.php`, `metadata/import.php`
- `mycap/display.php`
- `participantList/export.php`
- `pdf/export.php`
- `project/export.php`, `project/import.php`
- `project_settings/import.php`
- `project_xml/export.php`
- `projectMigration/export.php`
- `record/export.php`, `record/import.php`, `record/delete.php`,
  `record/rename.php`, `record/randomize.php`
- `repeatingFormsEvents/export.php`, `repeatingFormsEvents/import.php`
- `report/export.php`
- `surveyAccessCode/export.php`
- `surveyLink/export.php`
- `surveyQueueLink/export.php`
- `surveyReturnCode/export.php`
- `tableau/display.php`
- `user/export.php`, `user/import.php`, `user/delete.php`
- `userDagMapping/export.php`, `userDagMapping/import.php`
- `userRole/export.php`, `userRole/import.php`, `userRole/delete.php`
- `userRoleMapping/export.php`, `userRoleMapping/import.php`
- `version/export.php`

## Surface API par version

Les contenus API detectes evoluent ainsi dans les archives presentes :

| Version | Nombre de contenus | Ajouts detectes |
| --- | ---: | --- |
| 6.15.15 | 22 | Surface initiale observee : `record`, `metadata`, `file`, `event`, `arm`, `user`, `project`, `project_xml`, `report`, `pdf`, `version`, etc. |
| 7.4.23 | 24 | `generateNextRecordName`, `project_settings` |
| 8.10.20 | 25 | `repeatingFormsEvents` |
| 9.5.36 | 25 | Aucun ajout detecte |
| 10.6.28 | 27 | `dag`, `userDagMapping` |
| 11.1.29 | 28 | `log` |
| 12.4.31 | 31 | `tableau`, `userRole`, `userRoleMapping` |
| 13.7.31 | 33 | `fileRepository`, `mycap` |
| 14.5.44 | 33 | Aucun ajout detecte |
| 15.5.40 | 34 | `surveyAccessCode` |
| 16.1.9 | 35 | `projectMigration` |
| 17.0.5 | 35 | Aucun ajout detecte |

## Fichiers a ne pas confondre avec l'API publique

Certains chemins contiennent aussi le segment `API`, mais ne correspondent pas
au routeur public REDCap API :

- `redcap/redcap_v*/Libraries/vendor/doctrine/.../Driver/API/...`
- `redcap/redcap_v*/Classes/Rewards/Services/API/...`

Ces fichiers peuvent contenir des services internes ou des dependances vendor,
mais ils ne definissent pas la surface publique appelee via
`redcap/api/index.php`.

## Methode de verification

La cartographie ci-dessus a ete etablie en listant les fichiers des archives zip
avec `unzip -l`, puis en inspectant les fichiers clefs avec `unzip -p` :

```bash
unzip -l source/redcap17.0.5.zip | rg '/API/|/api/'
unzip -p source/redcap17.0.5.zip redcap/redcap_v17.0.5/API/index.php
unzip -p source/redcap17.0.5.zip redcap/redcap_v17.0.5/API/help.php
unzip -p source/redcap17.0.5.zip redcap/redcap_v17.0.5/Classes/RestUtility.php
```
