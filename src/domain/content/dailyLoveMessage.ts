export interface DatedLoveMessage {
  localDate: string
  body: string
}

export interface DailyLoveMessageSchedule {
  startsOn: string
  endsOn: string
  messages: readonly DatedLoveMessage[]
  postTripBody: string
}

export interface DailyLoveMessageViewModel {
  opening: 'Mon amour pour toujours,'
  body: string
  closing: 'With all my love,'
  signature: 'Yoav ❤️'
}

export function selectDailyLoveMessage(
  schedule: DailyLoveMessageSchedule,
  localDate: string,
): DailyLoveMessageViewModel | null {
  const body =
    localDate > schedule.endsOn
      ? schedule.postTripBody
      : schedule.messages.find(
          (message) => message.localDate === localDate,
        )?.body

  if (!body) {
    return null
  }

  return {
    opening: 'Mon amour pour toujours,',
    body,
    closing: 'With all my love,',
    signature: 'Yoav ❤️',
  }
}
