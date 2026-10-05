import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddChatMessageData {
  chatMessage_insert: ChatMessage_Key;
}

export interface AddChatMessageVariables {
  sessionId: UUIDString;
  sender: string;
  content: string;
  mediaUrl?: string | null;
}

export interface ChatMessage_Key {
  id: UUIDString;
  __typename?: 'ChatMessage_Key';
}

export interface ChatSession_Key {
  id: UUIDString;
  __typename?: 'ChatSession_Key';
}

export interface CreateChatSessionData {
  chatSession_insert: ChatSession_Key;
}

export interface CreateChatSessionVariables {
  title: string;
}

export interface CreateDiseaseRecordData {
  diseaseRecord_insert: DiseaseRecord_Key;
}

export interface CreateDiseaseRecordVariables {
  diseaseName: string;
  diseaseNameTh: string;
  confidence: number;
  severity?: string | null;
  imageUrl?: string | null;
  recommendation?: string | null;
}

export interface CreatePlotData {
  plot_insert: Plot_Key;
}

export interface CreatePlotVariables {
  name: string;
  cultivar: string;
  areaRai: number;
  plantDate?: DateString | null;
  harvestDateTarget?: DateString | null;
  soilType?: string | null;
}

export interface DeletePlotData {
  plot_delete?: Plot_Key | null;
}

export interface DeletePlotVariables {
  id: UUIDString;
}

export interface DiseaseRecord_Key {
  id: UUIDString;
  __typename?: 'DiseaseRecord_Key';
}

export interface GetChatMessagesData {
  chatMessages: ({
    id: UUIDString;
    sender: string;
    content: string;
    mediaUrl?: string | null;
    createdAt: TimestampString;
  } & ChatMessage_Key)[];
}

export interface GetChatMessagesVariables {
  sessionId: UUIDString;
}

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

export interface ListMyChatSessionsData {
  chatSessions: ({
    id: UUIDString;
    title: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & ChatSession_Key)[];
}

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

export interface Plot_Key {
  id: UUIDString;
  __typename?: 'Plot_Key';
}

export interface UpsertUserProfileData {
  user_upsert: User_Key;
}

export interface UpsertUserProfileVariables {
  email: string;
  displayName?: string | null;
  phoneNumber?: string | null;
  province?: string | null;
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

interface UpsertUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
  operationName: string;
}
export const upsertUserProfileRef: UpsertUserProfileRef;

export function upsertUserProfile(vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;
export function upsertUserProfile(dc: DataConnect, vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface CreatePlotRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePlotVariables): MutationRef<CreatePlotData, CreatePlotVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePlotVariables): MutationRef<CreatePlotData, CreatePlotVariables>;
  operationName: string;
}
export const createPlotRef: CreatePlotRef;

export function createPlot(vars: CreatePlotVariables): MutationPromise<CreatePlotData, CreatePlotVariables>;
export function createPlot(dc: DataConnect, vars: CreatePlotVariables): MutationPromise<CreatePlotData, CreatePlotVariables>;

interface DeletePlotRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeletePlotVariables): MutationRef<DeletePlotData, DeletePlotVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeletePlotVariables): MutationRef<DeletePlotData, DeletePlotVariables>;
  operationName: string;
}
export const deletePlotRef: DeletePlotRef;

export function deletePlot(vars: DeletePlotVariables): MutationPromise<DeletePlotData, DeletePlotVariables>;
export function deletePlot(dc: DataConnect, vars: DeletePlotVariables): MutationPromise<DeletePlotData, DeletePlotVariables>;

interface CreateDiseaseRecordRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDiseaseRecordVariables): MutationRef<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateDiseaseRecordVariables): MutationRef<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;
  operationName: string;
}
export const createDiseaseRecordRef: CreateDiseaseRecordRef;

export function createDiseaseRecord(vars: CreateDiseaseRecordVariables): MutationPromise<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;
export function createDiseaseRecord(dc: DataConnect, vars: CreateDiseaseRecordVariables): MutationPromise<CreateDiseaseRecordData, CreateDiseaseRecordVariables>;

interface CreateChatSessionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateChatSessionVariables): MutationRef<CreateChatSessionData, CreateChatSessionVariables>;
  operationName: string;
}
export const createChatSessionRef: CreateChatSessionRef;

export function createChatSession(vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;
export function createChatSession(dc: DataConnect, vars: CreateChatSessionVariables): MutationPromise<CreateChatSessionData, CreateChatSessionVariables>;

interface AddChatMessageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddChatMessageVariables): MutationRef<AddChatMessageData, AddChatMessageVariables>;
  operationName: string;
}
export const addChatMessageRef: AddChatMessageRef;

export function addChatMessage(vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;
export function addChatMessage(dc: DataConnect, vars: AddChatMessageVariables): MutationPromise<AddChatMessageData, AddChatMessageVariables>;

interface GetMyProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
  operationName: string;
}
export const getMyProfileRef: GetMyProfileRef;

export function getMyProfile(options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;
export function getMyProfile(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyProfileData, undefined>;

interface ListMyPlotsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyPlotsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyPlotsData, undefined>;
  operationName: string;
}
export const listMyPlotsRef: ListMyPlotsRef;

export function listMyPlots(options?: ExecuteQueryOptions): QueryPromise<ListMyPlotsData, undefined>;
export function listMyPlots(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyPlotsData, undefined>;

interface ListMyDiseaseRecordsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyDiseaseRecordsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyDiseaseRecordsData, undefined>;
  operationName: string;
}
export const listMyDiseaseRecordsRef: ListMyDiseaseRecordsRef;

export function listMyDiseaseRecords(options?: ExecuteQueryOptions): QueryPromise<ListMyDiseaseRecordsData, undefined>;
export function listMyDiseaseRecords(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyDiseaseRecordsData, undefined>;

interface ListMyChatSessionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyChatSessionsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyChatSessionsData, undefined>;
  operationName: string;
}
export const listMyChatSessionsRef: ListMyChatSessionsRef;

export function listMyChatSessions(options?: ExecuteQueryOptions): QueryPromise<ListMyChatSessionsData, undefined>;
export function listMyChatSessions(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyChatSessionsData, undefined>;

interface GetChatMessagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetChatMessagesVariables): QueryRef<GetChatMessagesData, GetChatMessagesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetChatMessagesVariables): QueryRef<GetChatMessagesData, GetChatMessagesVariables>;
  operationName: string;
}
export const getChatMessagesRef: GetChatMessagesRef;

export function getChatMessages(vars: GetChatMessagesVariables, options?: ExecuteQueryOptions): QueryPromise<GetChatMessagesData, GetChatMessagesVariables>;
export function getChatMessages(dc: DataConnect, vars: GetChatMessagesVariables, options?: ExecuteQueryOptions): QueryPromise<GetChatMessagesData, GetChatMessagesVariables>;

