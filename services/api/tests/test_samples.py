# Integration test for the public sample input: it must be accepted as a real CV and posting and analyze cleanly.


def test_sample_input_is_public_and_runs_as_a_real_analysis(client, auth_headers):
    response = client.get("/samples/analysis-input")
    assert response.status_code == 200
    sample = response.json()

    resume = client.post("/resumes", json=sample["resume"], headers=auth_headers)
    job = client.post("/job-descriptions", json=sample["job_description"], headers=auth_headers)
    assert resume.status_code == 201, resume.text
    assert job.status_code == 201, job.text

    analysis = client.post(
        "/analyses",
        json={"resume_id": resume.json()["id"], "job_description_id": job.json()["id"]},
        headers=auth_headers,
    ).json()
    detail = client.get(f"/analyses/{analysis['id']}", headers=auth_headers).json()
    assert detail["status"] == "completed"
    assert detail["error_code"] is None
