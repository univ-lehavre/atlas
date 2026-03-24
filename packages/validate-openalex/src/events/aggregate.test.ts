import { it, describe, expect } from "@effect/vitest";
import { aggregateEvents } from "./aggregate.js";
import type { IEvent } from "./types.js";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";

describe("aggregateEvents", () => {
  it("returns empty map when no events match the orcid", () => {
    const orcid = "ORCID:NOTMATCH" as unknown as ORCID;

    const events: IEvent[] = [
      {
        createdAt: "2020-01-01",
        updatedAt: "2020-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "openalex:1",
        id: "ORCID:1",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ A",
      } as unknown as IEvent,
    ];

    const result = aggregateEvents(orcid, events);
    expect(result instanceof Map).toBe(true);
    expect(Array.from(result.entries()).length).toBe(0);
  });

  it("counts publications by year and affiliation for matching events", () => {
    const orcid = "ORCID:1" as unknown as ORCID;

    const events: IEvent[] = [
      // matching
      {
        createdAt: "2020-01-01",
        updatedAt: "2020-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "openalex:1",
        id: "ORCID:1",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2020-02-01",
        updatedAt: "2020-02-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "openalex:2",
        id: "ORCID:1",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2021-01-01",
        updatedAt: "2021-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "openalex:3",
        id: "ORCID:1",
        entity: "institution",
        field: "publication_date",
        value: "2021",
        label: "Univ B",
      } as unknown as IEvent,
      // non-matching: wrong status
      {
        createdAt: "2021-01-01",
        updatedAt: "2021-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "pending",
        from: "openalex:4",
        id: "ORCID:1",
        entity: "institution",
        field: "publication_date",
        value: "2021",
        label: "Univ B",
      } as unknown as IEvent,
      // non-matching: wrong field
      {
        createdAt: "2021-01-01",
        updatedAt: "2021-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "openalex:5",
        id: "ORCID:1",
        entity: "institution",
        field: "affiliation",
        value: "ignored",
        label: "Univ B",
      } as unknown as IEvent,
    ];

    const result = aggregateEvents(orcid, events);

    expect(result.size).toBe(2);

    const univA = result.get("Univ A");
    expect(univA).toBeDefined();
    expect(univA!.get("2020")).toBe(2);

    const univB = result.get("Univ B");
    expect(univB).toBeDefined();
    expect(univB!.get("2021")).toBe(1);
  });

  it('uses "unknown" affiliation when label is missing', () => {
    const orcid = "ORCID:2" as unknown as ORCID;

    const events: IEvent[] = [
      {
        createdAt: "2022-01-01",
        updatedAt: "2022-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "openalex:1",
        id: "ORCID:2",
        entity: "institution",
        field: "publication_date",
        value: "2022",
      } as unknown as IEvent,
    ];

    const result = aggregateEvents(orcid, events);

    expect(result.size).toBe(1);
    const unknown = result.get("unknown");
    expect(unknown).toBeDefined();
    expect(unknown!.get("2022")).toBe(1);
  });

  it("aggregates a larger dataset with 5 institutions across multiple years", () => {
    const orcid = "ORCID:BIG" as unknown as ORCID;

    const events: IEvent[] = [
      // Univ A: 2018:1, 2019:2, 2020:3
      {
        createdAt: "2018-01-01",
        updatedAt: "2018-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:1",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2018",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2019-01-01",
        updatedAt: "2019-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:2",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2019",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2019-02-01",
        updatedAt: "2019-02-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:3",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2019",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2020-01-01",
        updatedAt: "2020-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:4",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2020-02-01",
        updatedAt: "2020-02-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:5",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ A",
      } as unknown as IEvent,
      {
        createdAt: "2020-03-01",
        updatedAt: "2020-03-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:6",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ A",
      } as unknown as IEvent,

      // Univ B: 2019:1, 2020:1, 2021:2
      {
        createdAt: "2019-03-01",
        updatedAt: "2019-03-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:7",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2019",
        label: "Univ B",
      } as unknown as IEvent,
      {
        createdAt: "2020-04-01",
        updatedAt: "2020-04-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:8",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ B",
      } as unknown as IEvent,
      {
        createdAt: "2021-01-01",
        updatedAt: "2021-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:9",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2021",
        label: "Univ B",
      } as unknown as IEvent,
      {
        createdAt: "2021-02-01",
        updatedAt: "2021-02-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:10",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2021",
        label: "Univ B",
      } as unknown as IEvent,

      // Univ C: 2020:5
      {
        createdAt: "2020-05-01",
        updatedAt: "2020-05-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:11",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ C",
      } as unknown as IEvent,
      {
        createdAt: "2020-06-01",
        updatedAt: "2020-06-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:12",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ C",
      } as unknown as IEvent,
      {
        createdAt: "2020-07-01",
        updatedAt: "2020-07-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:13",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ C",
      } as unknown as IEvent,
      {
        createdAt: "2020-08-01",
        updatedAt: "2020-08-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:14",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ C",
      } as unknown as IEvent,
      {
        createdAt: "2020-09-01",
        updatedAt: "2020-09-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:15",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ C",
      } as unknown as IEvent,

      // Univ D: 2018:2, 2022:1
      {
        createdAt: "2018-02-01",
        updatedAt: "2018-02-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:16",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2018",
        label: "Univ D",
      } as unknown as IEvent,
      {
        createdAt: "2018-03-01",
        updatedAt: "2018-03-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:17",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2018",
        label: "Univ D",
      } as unknown as IEvent,
      {
        createdAt: "2022-01-01",
        updatedAt: "2022-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:18",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2022",
        label: "Univ D",
      } as unknown as IEvent,

      // Univ E: 2017..2021 one each
      {
        createdAt: "2017-01-01",
        updatedAt: "2017-01-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:19",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2017",
        label: "Univ E",
      } as unknown as IEvent,
      {
        createdAt: "2018-04-01",
        updatedAt: "2018-04-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:20",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2018",
        label: "Univ E",
      } as unknown as IEvent,
      {
        createdAt: "2019-04-01",
        updatedAt: "2019-04-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:21",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2019",
        label: "Univ E",
      } as unknown as IEvent,
      {
        createdAt: "2020-10-01",
        updatedAt: "2020-10-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:22",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2020",
        label: "Univ E",
      } as unknown as IEvent,
      {
        createdAt: "2021-10-01",
        updatedAt: "2021-10-01",
        dataIntegrity: "ok",
        hasBeenExtendedAt: null,
        status: "accepted",
        from: "oa:23",
        id: "ORCID:BIG",
        entity: "institution",
        field: "publication_date",
        value: "2021",
        label: "Univ E",
      } as unknown as IEvent,
    ];

    const result = aggregateEvents(orcid, events);

    expect(result.size).toBe(5);

    expect(result.get("Univ A")!.get("2018")).toBe(1);
    expect(result.get("Univ A")!.get("2019")).toBe(2);
    expect(result.get("Univ A")!.get("2020")).toBe(3);

    expect(result.get("Univ B")!.get("2019")).toBe(1);
    expect(result.get("Univ B")!.get("2020")).toBe(1);
    expect(result.get("Univ B")!.get("2021")).toBe(2);

    expect(result.get("Univ C")!.get("2020")).toBe(5);

    expect(result.get("Univ D")!.get("2018")).toBe(2);
    expect(result.get("Univ D")!.get("2022")).toBe(1);

    expect(result.get("Univ E")!.get("2017")).toBe(1);
    expect(result.get("Univ E")!.get("2018")).toBe(1);
    expect(result.get("Univ E")!.get("2019")).toBe(1);
    expect(result.get("Univ E")!.get("2020")).toBe(1);
    expect(result.get("Univ E")!.get("2021")).toBe(1);
  });
});
