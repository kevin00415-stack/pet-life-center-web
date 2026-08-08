from guardian_vision_poc.guardian_mapping import adapt_ap10k_to_guardian, evidence_counts


def test_mapping_preserves_evidence_boundaries():
    keypoints = [[float(index), float(index + 1)] for index in range(17)]
    scores = [0.9] * 17
    landmarks = adapt_ap10k_to_guardian(keypoints, scores)
    assert len(landmarks) == 26
    assert evidence_counts(landmarks) == {"OBSERVED": 15, "ESTIMATED": 4, "UNKNOWN": 7}
    assert next(item for item in landmarks if item["key"] == "TAIL_TIP")["x"] is None


def test_low_confidence_is_unknown_not_occluded():
    keypoints = [[float(index), float(index + 1)] for index in range(17)]
    scores = [0.9] * 17
    scores[2] = 0.1
    nose = next(
        item for item in adapt_ap10k_to_guardian(keypoints, scores)
        if item["key"] == "NOSE"
    )
    assert nose["evidence"] == "UNKNOWN"
    assert nose["occlusion"] is None
    assert "not_occlusion" in nose["reason"]
