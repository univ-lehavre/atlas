# Class: RedcapClientService

Defined in: [packages/redcap-api/src/client.ts:110](https://github.com/univ-lehavre/atlas/blob/55f9855a424232d94722e95c6c935e435b5354ad/packages/redcap-api/src/client.ts#L110)

Effect Context Tag for the REDCap Client Service.

Use this tag for dependency injection with Effect's Layer system.
This allows you to provide mock implementations for testing or
swap implementations at runtime.

## Example

```typescript
import { Effect, Layer } from 'effect';
import {
  RedcapClientService,
  makeRedcapClientLayer,
  RedcapUrl,
  RedcapToken,
} from '@univ-lehavre/atlas-redcap-api';

// Create a layer with real configuration
const RedcapLayer = makeRedcapClientLayer({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AABBCCDD11223344AABBCCDD11223344'),
});

// Use the service in your program
const program = Effect.gen(function* () {
  const client = yield* RedcapClientService;
  return yield* client.getVersion();
});

// Provide the layer and run
Effect.runPromise(program.pipe(Effect.provide(RedcapLayer)));
```

## See

[makeRedcapClientLayer](../functions/makeRedcapClientLayer.md) - Create a Layer providing this service

## Extends

- `TagClassShape`\<`"RedcapClientService"`, [`RedcapClient`](../interfaces/RedcapClient.md), `this`\>

## Constructors

### Constructor

> **new RedcapClientService**(`_`): `RedcapClientService`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:109

#### Parameters

##### \_

`never`

#### Returns

`RedcapClientService`

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().constructor`

## Properties

### \[TagTypeId\]

> `readonly` **\[TagTypeId\]**: _typeof_ `TagTypeId`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:100

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[TagTypeId]`

---

### Id

> **Id**: `"RedcapClientService"`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:99

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().Id`

---

### Type

> `readonly` **Type**: [`RedcapClient`](../interfaces/RedcapClient.md)

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:101

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().Type`

---

### \_op

> `readonly` `static` **\_op**: `"Tag"`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:33

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >()._op`

---

### \[ChannelTypeId\]

> `readonly` `static` **\[ChannelTypeId\]**: `VarianceStruct`\<`never`, `unknown`, `never`, `unknown`, [`RedcapClient`](../interfaces/RedcapClient.md), `unknown`, `RedcapClientService`\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Channel.d.ts:108

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[ChannelTypeId]`

---

### \[EffectTypeId\]

> `readonly` `static` **\[EffectTypeId\]**: `VarianceStruct`\<[`RedcapClient`](../interfaces/RedcapClient.md), `never`, `RedcapClientService`\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Effect.d.ts:195

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[EffectTypeId]`

---

### \[ignoreSymbol\]?

> `static` `optional` **\[ignoreSymbol\]**: `TagUnifyIgnore`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:46

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[ignoreSymbol]`

---

### \[SinkTypeId\]

> `readonly` `static` **\[SinkTypeId\]**: `VarianceStruct`\<[`RedcapClient`](../interfaces/RedcapClient.md), `unknown`, `never`, `never`, `RedcapClientService`\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Sink.d.ts:82

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[SinkTypeId]`

---

### \[STMTypeId\]

> `readonly` `static` **\[STMTypeId\]**: `object`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/STM.d.ts:136

#### \_A

> `readonly` **\_A**: `Covariant`\<[`RedcapClient`](../interfaces/RedcapClient.md)\>

#### \_E

> `readonly` **\_E**: `Covariant`\<`never`\>

#### \_R

> `readonly` **\_R**: `Covariant`\<`RedcapClientService`\>

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[STMTypeId]`

---

### \[StreamTypeId\]

> `readonly` `static` **\[StreamTypeId\]**: `VarianceStruct`\<[`RedcapClient`](../interfaces/RedcapClient.md), `never`, `RedcapClientService`\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Stream.d.ts:111

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[StreamTypeId]`

---

### \[TagTypeId\]

> `readonly` `static` **\[TagTypeId\]**: `object`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:36

#### \_Identifier

> `readonly` **\_Identifier**: `Invariant`\<`RedcapClientService`\>

#### \_Service

> `readonly` **\_Service**: `Invariant`\<[`RedcapClient`](../interfaces/RedcapClient.md)\>

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[TagTypeId]`

---

### \[typeSymbol\]?

> `static` `optional` **\[typeSymbol\]**: `unknown`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:44

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[typeSymbol]`

---

### \[unifySymbol\]?

> `static` `optional` **\[unifySymbol\]**: `TagUnify`\<`TagClass`\<`RedcapClientService`, `"RedcapClientService"`, [`RedcapClient`](../interfaces/RedcapClient.md)\>\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:45

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[unifySymbol]`

---

### Identifier

> `readonly` `static` **Identifier**: `RedcapClientService`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:35

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().Identifier`

---

### key

> `readonly` `static` **key**: `"RedcapClientService"`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:110

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().key`

---

### Service

> `readonly` `static` **Service**: [`RedcapClient`](../interfaces/RedcapClient.md)

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:34

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().Service`

---

### stack?

> `readonly` `static` `optional` **stack**: `string`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:42

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().stack`

## Methods

### \[iterator\]()

> `static` **\[iterator\]**(): `EffectGenerator`\<`Tag`\<`RedcapClientService`, [`RedcapClient`](../interfaces/RedcapClient.md)\>\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Effect.d.ts:137

#### Returns

`EffectGenerator`\<`Tag`\<`RedcapClientService`, [`RedcapClient`](../interfaces/RedcapClient.md)\>\>

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[iterator]`

---

### \[NodeInspectSymbol\]()

> `static` **\[NodeInspectSymbol\]**(): `unknown`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Inspectable.d.ts:22

#### Returns

`unknown`

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().[NodeInspectSymbol]`

---

### context()

> `static` **context**(`self`): `Context`\<`RedcapClientService`\>

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:41

#### Parameters

##### self

[`RedcapClient`](../interfaces/RedcapClient.md)

#### Returns

`Context`\<`RedcapClientService`\>

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().context`

---

### of()

> `static` **of**(`self`): [`RedcapClient`](../interfaces/RedcapClient.md)

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Context.d.ts:40

#### Parameters

##### self

[`RedcapClient`](../interfaces/RedcapClient.md)

#### Returns

[`RedcapClient`](../interfaces/RedcapClient.md)

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().of`

---

### pipe()

#### Call Signature

> `static` **pipe**\<`A`\>(`this`): `A`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:10

##### Type Parameters

###### A

`A`

##### Parameters

###### this

`A`

##### Returns

`A`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`\>(`this`, `ab`): `B`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:11

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

##### Returns

`B`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`\>(`this`, `ab`, `bc`): `C`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:12

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

##### Returns

`C`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`\>(`this`, `ab`, `bc`, `cd`): `D`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:13

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

##### Returns

`D`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`\>(`this`, `ab`, `bc`, `cd`, `de`): `E`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:14

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

##### Returns

`E`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`): `F`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:15

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

##### Returns

`F`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`): `G`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:16

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

##### Returns

`G`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`): `H`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:17

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

##### Returns

`H`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`): `I`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:18

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

##### Returns

`I`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`): `J`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:19

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

##### Returns

`J`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`): `K`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:20

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

##### Returns

`K`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`): `L`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:21

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

##### Returns

`L`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`): `M`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:22

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

##### Returns

`M`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`): `N`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:23

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

##### Returns

`N`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`): `O`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:24

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

##### Returns

`O`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`): `P`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:25

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

##### Returns

`P`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`, `pq`): `Q`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:26

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

###### Q

`Q` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

###### pq

(`_`) => `Q`

##### Returns

`Q`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`, `pq`, `qr`): `R`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:27

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

###### Q

`Q` = `never`

###### R

`R` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

###### pq

(`_`) => `Q`

###### qr

(`_`) => `R`

##### Returns

`R`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`, `S`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`, `pq`, `qr`, `rs`): `S`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:28

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

###### Q

`Q` = `never`

###### R

`R` = `never`

###### S

`S` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

###### pq

(`_`) => `Q`

###### qr

(`_`) => `R`

###### rs

(`_`) => `S`

##### Returns

`S`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`, `S`, `T`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`, `pq`, `qr`, `rs`, `st`): `T`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:29

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

###### Q

`Q` = `never`

###### R

`R` = `never`

###### S

`S` = `never`

###### T

`T` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

###### pq

(`_`) => `Q`

###### qr

(`_`) => `R`

###### rs

(`_`) => `S`

###### st

(`_`) => `T`

##### Returns

`T`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`, `S`, `T`, `U`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`, `pq`, `qr`, `rs`, `st`, `tu`): `U`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:30

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

###### Q

`Q` = `never`

###### R

`R` = `never`

###### S

`S` = `never`

###### T

`T` = `never`

###### U

`U` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

###### pq

(`_`) => `Q`

###### qr

(`_`) => `R`

###### rs

(`_`) => `S`

###### st

(`_`) => `T`

###### tu

(`_`) => `U`

##### Returns

`U`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

#### Call Signature

> `static` **pipe**\<`A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`, `S`, `T`, `U`\>(`this`, `ab`, `bc`, `cd`, `de`, `ef`, `fg`, `gh`, `hi`, `ij`, `jk`, `kl`, `lm`, `mn`, `no`, `op`, `pq`, `qr`, `rs`, `st`, `tu`): `U`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Pipeable.d.ts:31

##### Type Parameters

###### A

`A`

###### B

`B` = `never`

###### C

`C` = `never`

###### D

`D` = `never`

###### E

`E` = `never`

###### F

`F` = `never`

###### G

`G` = `never`

###### H

`H` = `never`

###### I

`I` = `never`

###### J

`J` = `never`

###### K

`K` = `never`

###### L

`L` = `never`

###### M

`M` = `never`

###### N

`N` = `never`

###### O

`O` = `never`

###### P

`P` = `never`

###### Q

`Q` = `never`

###### R

`R` = `never`

###### S

`S` = `never`

###### T

`T` = `never`

###### U

`U` = `never`

##### Parameters

###### this

`A`

###### ab

(`_`) => `B`

###### bc

(`_`) => `C`

###### cd

(`_`) => `D`

###### de

(`_`) => `E`

###### ef

(`_`) => `F`

###### fg

(`_`) => `G`

###### gh

(`_`) => `H`

###### hi

(`_`) => `I`

###### ij

(`_`) => `J`

###### jk

(`_`) => `K`

###### kl

(`_`) => `L`

###### lm

(`_`) => `M`

###### mn

(`_`) => `N`

###### no

(`_`) => `O`

###### op

(`_`) => `P`

###### pq

(`_`) => `Q`

###### qr

(`_`) => `R`

###### rs

(`_`) => `S`

###### st

(`_`) => `T`

###### tu

(`_`) => `U`

##### Returns

`U`

##### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().pipe`

---

### toJSON()

> `static` **toJSON**(): `unknown`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Inspectable.d.ts:21

#### Returns

`unknown`

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().toJSON`

---

### toString()

> `static` **toString**(): `string`

Defined in: node_modules/.pnpm/effect@3.19.14/node_modules/effect/dist/dts/Inspectable.d.ts:20

#### Returns

`string`

#### Inherited from

`Context.Tag('RedcapClientService')< RedcapClientService, RedcapClient >().toString`
