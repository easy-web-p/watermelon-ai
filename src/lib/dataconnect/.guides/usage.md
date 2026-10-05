# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertUserProfile, createPlot, deletePlot, createDiseaseRecord, createChatSession, addChatMessage, getMyProfile, listMyPlots, listMyDiseaseRecords, listMyChatSessions } from '@watermelon/dataconnect';


// Operation UpsertUserProfile:  For variables, look at type UpsertUserProfileVars in ../index.d.ts
const { data } = await UpsertUserProfile(dataConnect, upsertUserProfileVars);

// Operation CreatePlot:  For variables, look at type CreatePlotVars in ../index.d.ts
const { data } = await CreatePlot(dataConnect, createPlotVars);

// Operation DeletePlot:  For variables, look at type DeletePlotVars in ../index.d.ts
const { data } = await DeletePlot(dataConnect, deletePlotVars);

// Operation CreateDiseaseRecord:  For variables, look at type CreateDiseaseRecordVars in ../index.d.ts
const { data } = await CreateDiseaseRecord(dataConnect, createDiseaseRecordVars);

// Operation CreateChatSession:  For variables, look at type CreateChatSessionVars in ../index.d.ts
const { data } = await CreateChatSession(dataConnect, createChatSessionVars);

// Operation AddChatMessage:  For variables, look at type AddChatMessageVars in ../index.d.ts
const { data } = await AddChatMessage(dataConnect, addChatMessageVars);

// Operation GetMyProfile: 
const { data } = await GetMyProfile(dataConnect);

// Operation ListMyPlots: 
const { data } = await ListMyPlots(dataConnect);

// Operation ListMyDiseaseRecords: 
const { data } = await ListMyDiseaseRecords(dataConnect);

// Operation ListMyChatSessions: 
const { data } = await ListMyChatSessions(dataConnect);


```