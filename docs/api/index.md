**@univ-lehavre/atlas-redcap-api**

---

# @univ-lehavre/atlas-redcap-api

## Classes

| Class                                                 | Description                                          |
| ----------------------------------------------------- | ---------------------------------------------------- |
| [RedcapApiError](classes/RedcapApiError.md)           | Application-level error from REDCap API.             |
| [RedcapClientService](classes/RedcapClientService.md) | Effect Context Tag for the REDCap Client Service.    |
| [RedcapHttpError](classes/RedcapHttpError.md)         | HTTP-level error from REDCap API.                    |
| [RedcapNetworkError](classes/RedcapNetworkError.md)   | Network-level error during REDCap API communication. |

## Interfaces

| Interface                                                    | Description                                     |
| ------------------------------------------------------------ | ----------------------------------------------- |
| [ExportRecordsOptions](interfaces/ExportRecordsOptions.md)   | Options for exporting records from REDCap.      |
| [ImportRecordsOptions](interfaces/ImportRecordsOptions.md)   | Options for importing records into REDCap.      |
| [RedcapClient](interfaces/RedcapClient.md)                   | REDCap API client interface.                    |
| [RedcapConfig](interfaces/RedcapConfig.md)                   | Configuration for REDCap API client.            |
| [RedcapExportFieldName](interfaces/RedcapExportFieldName.md) | REDCap export field name mapping.               |
| [RedcapField](interfaces/RedcapField.md)                     | REDCap field metadata from the data dictionary. |
| [RedcapInstrument](interfaces/RedcapInstrument.md)           | REDCap instrument (form) metadata.              |
| [RedcapProjectInfo](interfaces/RedcapProjectInfo.md)         | REDCap project information returned by the API. |

## Type Aliases

| Type Alias                                       | Description                                             |
| ------------------------------------------------ | ------------------------------------------------------- |
| [InstrumentName](type-aliases/InstrumentName.md) | Branded type for REDCap instrument names.               |
| [RecordId](type-aliases/RecordId.md)             | Branded type for REDCap record IDs.                     |
| [RedcapError](type-aliases/RedcapError.md)       | Union type representing all possible REDCap API errors. |
| [RedcapToken](type-aliases/RedcapToken.md)       | Branded type for REDCap API token.                      |
| [RedcapUrl](type-aliases/RedcapUrl.md)           | Branded type for REDCap API URL.                        |

## Variables

| Variable                                      | Description                                           |
| --------------------------------------------- | ----------------------------------------------------- |
| [InstrumentName](variables/InstrumentName.md) | Constructor function for InstrumentName branded type. |
| [RecordId](variables/RecordId.md)             | Constructor function for RecordId branded type.       |
| [RedcapToken](variables/RedcapToken.md)       | Constructor function for RedcapToken branded type.    |
| [RedcapUrl](variables/RedcapUrl.md)           | Constructor function for RedcapUrl branded type.      |

## Functions

| Function                                                      | Description                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [createRedcapClient](functions/createRedcapClient.md)         | Creates a new REDCap API client instance.                               |
| [escapeFilterLogicValue](functions/escapeFilterLogicValue.md) | Escapes special characters in a value to be used in REDCap filterLogic. |
| [makeRedcapClientLayer](functions/makeRedcapClientLayer.md)   | Creates an Effect Layer providing the RedcapClientService.              |
