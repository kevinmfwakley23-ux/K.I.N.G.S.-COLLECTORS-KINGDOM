export class MemoryContextAuthority {
  inspect(memory) {
    if (!memory?.id) {
      throw new Error("K.I.N.G.S. Memory Context: memory id is required");
    }
    if (!memory.createdAt) {
      throw new Error(`K.I.N.G.S. Memory Context: memory "${memory.id}" requires createdAt`);
    }
    if (!memory.updatedAt) {
      throw new Error(`K.I.N.G.S. Memory Context: memory "${memory.id}" requires updatedAt`);
    }
    if (!Array.isArray(memory.sourceReferences) || memory.sourceReferences.length === 0) {
      throw new Error(`K.I.N.G.S. Memory Context: memory "${memory.id}" requires provenance`);
    }
    return {
      memoryId: memory.id,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      missionId: memory.missionId,
      taskId: memory.taskId,
      sourceReferences: [...memory.sourceReferences],
      authoritative: Boolean(memory.authoritative),
      hasMissionContext: Boolean(memory.missionId),
      hasTaskContext: Boolean(memory.taskId),
      hasProvenance: memory.sourceReferences.length > 0
    };
  }

  isContextSpecific(memory) {
    return Boolean(memory?.missionId || memory?.taskId);
  }

  isProjectPortable(memory) {
    return !memory?.missionId && !memory?.taskId;
  }
}
