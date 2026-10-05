# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `watermelon-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMyProfile*](#getmyprofile)
  - [*ListMyPlots*](#listmyplots)
  - [*ListMyDiseaseRecords*](#listmydiseaserecords)
  - [*ListMyChatSessions*](#listmychatsessions)
  - [*GetChatMessages*](#getchatmessages)
- [**Mutations**](#mutations)
  - [*UpsertUserProfile*](#upsertuserprofile)
  - [*CreatePlot*](#createplot)
  - [*DeletePlot*](#deleteplot)
  - [*CreateDiseaseRecord*](#creatediseaserecord)
  - [*CreateChatSession*](#createchatsession)
  - [*AddChatMessage*](#addchatmessage)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `watermelon-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@watermelon/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@watermelon/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@watermelon/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `watermelon-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMyProfile
You can execute the `GetMyProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getMyProfile(options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;

interface GetMyProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
}
export const getMyProfileRef: GetMyProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyProfile(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;

interface GetMyProfileRef {
  ...
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
}
export const getMyProfileRef: GetMyProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyProfileRef:
```typescript
const name = getMyProfileRef.operationName;
console.log(name);
```

### Variables
The `GetMyProfile` query has no variables.
### Return Type
Recall that executing the `GetMyProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyProfileData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyProfileData {
  user?: {
    uid: string;
    email: string;
    displayName?: string | null;
    phoneNumber?: string | null;
    province?: string | null;
    createdAt: TimestampString;
  } & User_Key;
}
```
### Using `GetMyProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyProfile } from '@watermelon/dataconnect';


// Call the `getMyProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyProfile();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyProfile(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getMyProfile().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetMyProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyProfileRef } from '@watermelon/dataconnect';


// Call the `getMyProfileRef()` function to get a reference to the query.
const ref = getMyProfileRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyProfileRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListMyPlots
You can execute the `ListMyPlots` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyPlots(options?: ExecuteQueryOptions): QueryPromise<ListMyPlotsData, undefined>;

interface ListMyPlotsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyPlotsData, undefined>;
}
export const listMyPlotsRef: ListMyPlotsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyPlots(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyPlotsData, undefined>;

interface ListMyPlotsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyPlotsData, undefined>;
}
export const listMyPlotsRef: ListMyPlotsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyPlotsRef:
```typescript
const name = listMyPlotsRef.operationName;
console.log(name);
```

### Variables
The `ListMyPlots` query has no variables.
### Return Type
Recall that executing the `ListMyPlots` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyPlotsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyPlotsData {
  plots: ({
    id: UUIDString;
    name: string;
    cultivar: string;
    areaRai: number;
    plantDate?: DateString | null;
    harvestDateTarget?: DateString | null;
    soilType?: string | null;
    status: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Plot_Key)[];
}
```
### Using `ListMyPlots`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyPlots } from '@watermelon/dataconnect';


// Call the `listMyPlots()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyPlots();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyPlots(dataConnect);

console.log(data.plots);

// Or, you can use the `Promise` API.
listMyPlots().then((response) => {
  const data = response.data;
  console.log(data.plots);
});
```

### Using `ListMyPlots`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyPlotsRef } from '@watermelon/dataconnect';


// Call the `listMyPlotsRef()` function to get a reference to the query.
const ref = listMyPlotsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyPlotsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.plots);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.plots);
});
```

## ListMyDiseaseRecords
You can execute the `ListMyDiseaseRecords` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyDiseaseRecords(options?: ExecuteQueryOptions): QueryPromise<ListMyDiseaseRecordsData, undefined>;

interface ListMyDiseaseRecordsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyDiseaseRecordsData, undefined>;
}
export const listMyDiseaseRecordsRef: ListMyDiseaseRecordsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyDiseaseRecords(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyDiseaseRecordsData, undefined>;

interface ListMyDiseaseRecordsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyDiseaseRecordsData, undefined>;
}
export const listMyDiseaseRecordsRef: ListMyDiseaseRecordsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyDiseaseRecordsRef:
```typescript
const name = listMyDiseaseRecordsRef.operationName;
console.log(name);
```

### Variables
The `ListMyDiseaseRecords` query has no variables.
### Return Type
Recall that executing the `ListMyDiseaseRecords` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyDiseaseRecordsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyDiseaseRecordsData {
  diseaseRecords: ({
    id: UUIDString;
    diseaseName: string;
    diseaseNameTh: string;
    confidence: number;
    severity?: string | null;
    imageUrl?: string | null;
    recommendation?: string | null;
    createdAt: TimestampString;
  } & DiseaseRecord_Key)[];
}
```
### Using `ListMyDiseaseRecords`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyDiseaseRecords } from '@watermelon/dataconnect';


// Call the `listMyDiseaseRecords()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyDiseaseRecords();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyDiseaseRecords(dataConnect);

console.log(data.diseaseRecords);

// Or, you can use the `Promise` API.
listMyDiseaseRecords().then((response) => {
  const data = response.data;
  console.log(data.diseaseRecords);
});
```

### Using `ListMyDiseaseRecords`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyDiseaseRecordsRef } from '@watermelon/dataconnect';


// Call the `listMyDiseaseRecordsRef()` function to get a reference to the query.
const ref = listMyDiseaseRecordsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyDiseaseRecordsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.diseaseRecords);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.diseaseRecords);
});
```

## ListMyChatSessions
You can execute the `ListMyChatSessions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
listMyChatSessions(options?: ExecuteQueryOptions): QueryPromise<ListMyChatSessionsData, undefined>;

interface ListMyChatSessionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyChatSessionsData, undefined>;
}
export const listMyChatSessionsRef: ListMyChatSessionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyChatSessions(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyChatSessionsData, undefined>;

interface ListMyChatSessionsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyChatSessionsData, undefined>;
}
export const listMyChatSessionsRef: ListMyChatSessionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyChatSessionsRef:
```typescript
const name = listMyChatSessionsRef.operationName;
console.log(name);
```

### Variables
The `ListMyChatSessions` query has no variables.
### Return Type
Recall that executing the `ListMyChatSessions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyChatSessionsData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyChatSessionsData {
  chatSessions: ({
    id: UUIDString;
    title: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & ChatSession_Key)[];
}
```
### Using `ListMyChatSessions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyChatSessions } from '@watermelon/dataconnect';


// Call the `listMyChatSessions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyChatSessions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyChatSessions(dataConnect);

console.log(data.chatSessions);

// Or, you can use the `Promise` API.
listMyChatSessions().then((response) => {
  const data = response.data;
  console.log(data.chatSessions);
});
```

### Using `ListMyChatSessions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyChatSessionsRef } from '@watermelon/dataconnect';


// Call the `listMyChatSessionsRef()` function to get a reference to the query.
const ref = listMyChatSessionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyChatSessionsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chatSessions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chatSessions);
});
```

## GetChatMessages
You can execute the `GetChatMessages` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getChatMessages(vars: GetChatMessagesVariables, options?: ExecuteQueryOptions): QueryPromise<GetChatMessagesData, GetChatMessagesVariables>;

interface GetChatMessagesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetChatMessagesVariables): QueryRef<GetChatMessagesData, GetChatMessagesVariables>;
}
export const getChatMessagesRef: GetChatMessagesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getChatMessages(dc: DataConnect, vars: GetChatMessagesVariables, options?: ExecuteQueryOptions): QueryPromise<GetChatMessagesData, GetChatMessagesVariables>;

interface GetChatMessagesRef {
  ...
  (dc: DataConnect, vars: GetChatMessagesVariables): QueryRef<GetChatMessagesData, GetChatMessagesVariables>;
}
export const getChatMessagesRef: GetChatMessagesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getChatMessagesRef:
```typescript
const name = getChatMessagesRef.operationName;
console.log(name);
```

### Variables
The `GetChatMessages` query requires an argument of type `GetChatMessagesVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetChatMessagesVariables {
  sessionId: UUIDString;
}
```
### Return Type
Recall that executing the `GetChatMessages` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetChatMessagesData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetChatMessagesData {
  chatMessages: ({
    id: UUIDString;
    sender: string;
    content: string;
    mediaUrl?: string | null;
    createdAt: TimestampString;
  } & ChatMessage_Key)[];
}
```
### Using `GetChatMessages`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getChatMessages, GetChatMessagesVariables } from '@watermelon/dataconnect';

// The `GetChatMessages` query requires an argument of type `GetChatMessagesVariables`:
const getChatMessagesVars: GetChatMessagesVariables = {
  sessionId: ..., 
};

// Call the `getChatMessages()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getChatMessages(getChatMessagesVars);
// Variables can be defined inline as well.
const { data } = await getChatMessages({ sessionId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getChatMessages(dataConnect, getChatMessagesVars);

console.log(data.chatMessages);

// Or, you can use the `Promise` API.
getChatMessages(getChatMessagesVars).then((response) => {
  const data = response.data;
  console.log(data.chatMessages);
});
```

### Using `GetChatMessages`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getChatMessagesRef, GetChatMessagesVariables } from '@watermelon/dataconnect';

// The `GetChatMessages` query requires an argument of type `GetChatMessagesVariables`:
const getChatMessagesVars: GetChatMessagesVariables = {
  sessionId: ..., 
};

// Call the `getChatMessagesRef()` function to get a reference to the query.
const ref = getChatMessagesRef(getChatMessagesVars);
// Variables can be defined inline as well.
const ref = getChatMessagesRef({ sessionId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getChatMessagesRef(dataConnect, getChatMessagesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chatMessages);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chatMessages);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `watermelon-connector` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertUserProfile
You can execute the `UpsertUserProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
upsertUserProfile(vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface UpsertUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
}
export const upsertUserProfileRef: UpsertUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertUserProfile(dc: DataConnect, vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface UpsertUserProfileRef {
  ...
  (dc: DataConnect, vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
}
export const upsertUserProfileRef: UpsertUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertUserProfileRef:
```typescript
const name = upsertUserProfileRef.operationName;
console.log(name);
```

### Variables
The `UpsertUserProfile` mutation requires an argument of type `UpsertUserProfileVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserProfileVariables {
  email: string;
  displayName?: string | null;
  phoneNumber?: string | null;
  province?: string | null;
}
```
### Return Type
Recall that executing the `UpsertUserProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertUserProfileData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertUserProfileData {
  user_upsert: User_Key;
}
```
### Using `UpsertUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertUserProfile, UpsertUserProfileVariables } from '@watermelon/dataconnect';

// The `UpsertUserProfile` mutation requires an argument of type `UpsertUserProfileVariables`:
const upsertUserProfileVars: UpsertUserProfileVariables = {
  email: ..., 
  displayName: ..., // optional
  phoneNumber: ..., // optional
  province: ..., // optional
};

// Call the `upsertUserProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUserProfile(upsertUserProfileVars);
// Variables can be defined inline as well.
const { data } = await upsertUserProfile({ email: ..., displayName: ..., phoneNumber: ..., province: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertUserProfile(dataConnect, upsertUserProfileVars);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
upsertUserProfile(upsertUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

### Using `UpsertUserProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertUserProfileRef, UpsertUserProfileVariables } from '@watermelon/dataconnect';

// The `UpsertUserProfile` mutation requires an argument of type `UpsertUserProfileVariables`:
const upsertUserProfileVars: UpsertUserProfileVariables = {
  email: ..., 
  displayName: ..., // optional
  phoneNumber: ..., // optional
  province: ..., // optional
};

// Call the `upsertUserProfileRef()` function to get a reference to the mutation.
const ref = upsertUserProfileRef(upsertUserProfileVars);
// Variables can be defined inline as well.
const ref = upsertUserProfileRef({ email: ..., displayName: ..., phoneNumber: ..., province: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertUserProfileRef(dataConnect, upsertUserProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

## CreatePlot
You can execute the `CreatePlot` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createPlot(vars: CreatePlotVariables): MutationPromise<CreatePlotData, CreatePlotVariables>;

interface CreatePlotRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePlotVariables): MutationRef<CreatePlotData, CreatePlotVariables>;
}
export const createPlotRef: CreatePlotRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPlot(dc: DataConnect, vars: CreatePlotVariables): MutationPromise<CreatePlotData, CreatePlotVariables>;

interface CreatePlotRef {
  ...
  (dc: DataConnect, vars: CreatePlotVariables): MutationRef<CreatePlotData, CreatePlotVariables>;
}
export const createPlotRef: CreatePlotRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPlotRef:
```typescript
const name = createPlotRef.operationName;
console.log(name);
```

### Variables
The `CreatePlot` mutation requires an argument of type `CreatePlotVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePlotVariables {
  name: string;
  cultivar: string;
  areaRai: number;
  plantDate?: DateString | null;
  harvestDateTarget?: DateString | null;
  soilType?: string | null;
}
```
### Return Type
Recall that executing the `CreatePlot` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePlotData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePlotData {
  plot_insert: Plot_Key;
}
```
### Using `CreatePlot`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPlot, CreatePlotVariables } from '@watermelon/dataconnect';

// The `CreatePlot` mutation requires an argument of type `CreatePlotVariables`:
const createPlotVars: CreatePlotVariables = {
  name: ..., 
  cultivar: ..., 
  areaRai: ..., 
  plantDate: ..., // optional
  harvestDateTarget: ..., // optional
  soilType: ..., // optional
};

// Call the `createPlot()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPlot(createPlotVars);
// Variables can be defined inline as well.
const { data } = await createPlot({ name: ..., cultivar: ..., areaRai: ..., plantDate: ..., harvestDateTarget: ..., soilType: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPlot(dataConnect, createPlotVars);

console.log(data.plot_insert);

// Or, you can use the `Promise` API.
createPlot(createPlotVars).then((response) => {
  const data = response.data;
  console.log(data.plot_insert);
});
```

### Using `CreatePlot`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPlotRef, CreatePlotVariables } from '@watermelon/dataconnect';

// The `CreatePlot` mutation requires an argument of type `CreatePlotVariables`:
const createPlotVars: CreatePlotVariables = {
  name: ..., 
  cultivar: ..., 
  areaRai: ..., 
  plantDate: ..., // optional
  harvestDateTarget: ..., // optional
  soilType: ..., // optional
};

// Call the `createPlotRef()` function to get a reference to the mutation.
const ref = createPlotRef(createPlotVars);
// Variables can be defined inline as well.
const ref = createPlotRef({ name: ..., cultivar: ..., areaRai: ..., plantDate: ..., harvestDateTarget: ..., soilType: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPlotRef(dataConnect, createPlotVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.plot_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.plot_insert);
});
```

## DeletePlot
You can execute the `DeletePlot` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
deletePlot(vars: DeletePlotVariables): MutationPromise<DeletePlotData, DeletePlotVariables>;

interface DeletePlotRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePlotVariables): MutationRef<DeletePlotData, DeletePlotVariables>;
}
export const deletePlotRef: DeletePlotRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deletePlot(dc: DataConnect, vars: DeletePlotVariables): MutationPromise<DeletePlotData, DeletePlotVariables>;

interface DeletePlotRef {
  ...
  (dc: DataConnect, vars: DeletePlotVariables): MutationRef<DeletePlotData, DeletePlotVariables>;
}
export const deletePlotRef: DeletePlotRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deletePlotRef:
```typescript
const name = deletePlotRef.operationName;
console.log(name);
```

### Variables
The `DeletePlot` mutation requires an argument of type `DeletePlotVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeletePlotVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeletePlot` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeletePlotData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeletePlotData {
  plot_delete?: Plot_Key | null;
}
```
### Using `DeletePlot`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deletePlot, DeletePlotVariables } from '@watermelon/dataconnect';

// The `DeletePlot` mutation requires an argument of type `DeletePlotVariables`:
const deletePlotVars: DeletePlotVariables = {
  id: ..., 
};

// Call the `deletePlot()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deletePlot(deletePlotVars);
// Variables can be defined inline as well.
const { data } = await deletePlot({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deletePlot(dataConnect, deletePlotVars);

console.log(data.plot_delete);

// Or, you can use the `Promise` API.
deletePlot(deletePlotVars).then((response) => {
  const data = response.data;
  console.log(data.plot_delete);
});
```

### Using `DeletePlot`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deletePlotRef, DeletePlotVariables } from '@watermelon/dataconnect';

// The `DeletePlot` mutation requires an argument of type `DeletePlotVariables`:
const deletePlotVars: DeletePlotVariables = {
  id: ..., 
};

// Call the `deletePlotRef()` function to get a reference to the mutation.
const ref = deletePlotRef(deletePlotVars);
// Variables can be defined inline as well.
const ref = deletePlotRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deletePlotRef(dataConnect, deletePlotVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.plot_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.plot_delete);
});
```

## CreateDiseaseRecord
You can execute the `CreateDiseaseRecord` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createDiseaseRecord(vars: CreateDiseaseRecordVariables): MutationPromise<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;

interface CreateDiseaseRecordRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDiseaseRecordVariables): MutationRef<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;
}
export const createDiseaseRecordRef: CreateDiseaseRecordRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createDiseaseRecord(dc: DataConnect, vars: CreateDiseaseRecordVariables): MutationPromise<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;

interface CreateDiseaseRecordRef {
  ...
  (dc: DataConnect, vars: CreateDiseaseRecordVariables): MutationRef<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;
}
export const createDiseaseRecordRef: CreateDiseaseRecordRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createDiseaseRecordRef:
```typescript
const name = createDiseaseRecordRef.operationName;
console.log(name);
```

### Variables
The `CreateDiseaseRecord` mutation requires an argument of type `CreateDiseaseRecordVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateDiseaseRecordVariables {
  diseaseName: string;
  diseaseNameTh: string;
  confidence: number;
  severity?: string | null;
  imageUrl?: string | null;
  recommendation?: string | null;
}
```
### Return Type
Recall that executing the `CreateDiseaseRecord` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateDiseaseRecordData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateDiseaseRecordData {
  diseaseRecord_insert: DiseaseRecord_Key;
}
```
### Using `CreateDiseaseRecord`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createDiseaseRecord, CreateDiseaseRecordVariables } from '@watermelon/dataconnect';

// The `CreateDiseaseRecord` mutation requires an argument of type `CreateDiseaseRecordVariables`:
const createDiseaseRecordVars: CreateDiseaseRecordVariables = {
  diseaseName: ..., 
  diseaseNameTh: ..., 
  confidence: ..., 
  severity: ..., // optional
  imageUrl: ..., // optional
  recommendation: ..., // optional
};

// Call the `createDiseaseRecord()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createDiseaseRecord(createDiseaseRecordVars);
// Variables can be defined inline as well.
const { data } = await createDiseaseRecord({ diseaseName: ..., diseaseNameTh: ..., confidence: ..., severity: ..., imageUrl: ..., recommendation: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createDiseaseRecord(dataConnect, createDiseaseRecordVars);

console.log(data.diseaseRecord_insert);

// Or, you can use the `Promise` API.
createDiseaseRecord(createDiseaseRecordVars).then((response) => {
  const data = response.data;
  console.log(data.diseaseRecord_insert);
});
```

### Using `CreateDiseaseRecord`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createDiseaseRecordRef, CreateDiseaseRecordVariables } from '@watermelon/dataconnect';

// The `CreateDiseaseRecord` mutation requires an argument of type `CreateDiseaseRecordVariables`:
const createDiseaseRecordVars: CreateDiseaseRecordVariables = {
  diseaseName: ..., 
  diseaseNameTh: ..., 
  confidence: ..., 
  severity: ..., // optional
  imageUrl: ..., // optional
  recommendation: ..., // optional
};

// Call the `createDiseaseRecordRef()` function to get a reference to the mutation.
const ref = createDiseaseRecordRef(createDiseaseRecordVars);
// Variables can be defined inline as well.
const ref = createDiseaseRecordRef({ diseaseName: ..., diseaseNameTh: ..., confidence: ..., severity: ..., imageUrl: ..., recommendation: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createDiseaseRecordRef(dataConnect, createDiseaseRecordVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.diseaseRecord_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.diseaseRecord_insert);
});
```

## CreateChatSession
You can execute the `CreateChatSession` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createChatSession(vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;

interface CreateChatSessionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
}
export const createChatSessionRef: CreateChatSessionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createChatSession(dc: DataConnect, vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;

interface CreateChatSessionRef {
  ...
  (dc: DataConnect, vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
}
export const createChatSessionRef: CreateChatSessionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createChatSessionRef:
```typescript
const name = createChatSessionRef.operationName;
console.log(name);
```

### Variables
The `CreateChatSession` mutation requires an argument of type `CreateChatSessionVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateChatSessionVariables {
  title: string;
}
```
### Return Type
Recall that executing the `CreateChatSession` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateChatSessionData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateChatSessionData {
  chatSession_insert: ChatSession_Key;
}
```
### Using `CreateChatSession`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createChatSession, CreateChatSessionVariables } from '@watermelon/dataconnect';

// The `CreateChatSession` mutation requires an argument of type `CreateChatSessionVariables`:
const createChatSessionVars: CreateChatSessionVariables = {
  title: ..., 
};

// Call the `createChatSession()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createChatSession(createChatSessionVars);
// Variables can be defined inline as well.
const { data } = await createChatSession({ title: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createChatSession(dataConnect, createChatSessionVars);

console.log(data.chatSession_insert);

// Or, you can use the `Promise` API.
createChatSession(createChatSessionVars).then((response) => {
  const data = response.data;
  console.log(data.chatSession_insert);
});
```

### Using `CreateChatSession`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createChatSessionRef, CreateChatSessionVariables } from '@watermelon/dataconnect';

// The `CreateChatSession` mutation requires an argument of type `CreateChatSessionVariables`:
const createChatSessionVars: CreateChatSessionVariables = {
  title: ..., 
};

// Call the `createChatSessionRef()` function to get a reference to the mutation.
const ref = createChatSessionRef(createChatSessionVars);
// Variables can be defined inline as well.
const ref = createChatSessionRef({ title: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createChatSessionRef(dataConnect, createChatSessionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chatSession_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chatSession_insert);
});
```

## AddChatMessage
You can execute the `AddChatMessage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
addChatMessage(vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;

interface AddChatMessageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
}
export const addChatMessageRef: AddChatMessageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addChatMessage(dc: DataConnect, vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;

interface AddChatMessageRef {
  ...
  (dc: DataConnect, vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
}
export const addChatMessageRef: AddChatMessageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addChatMessageRef:
```typescript
const name = addChatMessageRef.operationName;
console.log(name);
```

### Variables
The `AddChatMessage` mutation requires an argument of type `AddChatMessageVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddChatMessageVariables {
  sessionId: UUIDString;
  sender: string;
  content: string;
  mediaUrl?: string | null;
}
```
### Return Type
Recall that executing the `AddChatMessage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddChatMessageData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddChatMessageData {
  chatMessage_insert: ChatMessage_Key;
}
```
### Using `AddChatMessage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addChatMessage, AddChatMessageVariables } from '@watermelon/dataconnect';

// The `AddChatMessage` mutation requires an argument of type `AddChatMessageVariables`:
const addChatMessageVars: AddChatMessageVariables = {
  sessionId: ..., 
  sender: ..., 
  content: ..., 
  mediaUrl: ..., // optional
};

// Call the `addChatMessage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addChatMessage(addChatMessageVars);
// Variables can be defined inline as well.
const { data } = await addChatMessage({ sessionId: ..., sender: ..., content: ..., mediaUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addChatMessage(dataConnect, addChatMessageVars);

console.log(data.chatMessage_insert);

// Or, you can use the `Promise` API.
addChatMessage(addChatMessageVars).then((response) => {
  const data = response.data;
  console.log(data.chatMessage_insert);
});
```

### Using `AddChatMessage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addChatMessageRef, AddChatMessageVariables } from '@watermelon/dataconnect';

// The `AddChatMessage` mutation requires an argument of type `AddChatMessageVariables`:
const addChatMessageVars: AddChatMessageVariables = {
  sessionId: ..., 
  sender: ..., 
  content: ..., 
  mediaUrl: ..., // optional
};

// Call the `addChatMessageRef()` function to get a reference to the mutation.
const ref = addChatMessageRef(addChatMessageVars);
// Variables can be defined inline as well.
const ref = addChatMessageRef({ sessionId: ..., sender: ..., content: ..., mediaUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addChatMessageRef(dataConnect, addChatMessageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chatMessage_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chatMessage_insert);
});
```

