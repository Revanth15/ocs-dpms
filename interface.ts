
export interface participant {
    name: string;
    formation: string;
    contingent: string;
    totalPeriodsAbsent: string;
}

export interface rehearsal {
    date: Date
    attendance: attendance[]
}

export interface attendance {
    partipantId: string;
    periodsAbsent: number;
    hoursAbsent: number;
    participant?: participant
}
