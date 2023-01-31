using System.Collections.Generic;
using UnityEngine;

public class Dice : MonoBehaviour {
  private const float _minDelta = 3.0f;
  private readonly List<GameObject> _flagBalls = new List<GameObject>();

  // The number of the upper face: 1, 2, 3, 4, 5 or 6.
  //
  // -1 means the dice is still moving or bouncing.
  //
  // 0 means the dice might be oblique and we cannot tell which side is facing up.
  public int State {
    get {
      if (GetComponent<Rigidbody>().velocity.magnitude == 0) {
        return CalcUpperFace();
      } else {
        return -1;
      }
    }
  }

  // Rotate the dice randomly.
  public void RandomRotate() {
    transform.eulerAngles = new Vector3(Random.Range(0, 360),
                                        Random.Range(0, 360),
                                        Random.Range(0, 360));
  }

  void Awake() {
    for (int i = 0; i < 6; i++) {
      var flagBall = transform.Find($"Flag.Ball.{i+1}").gameObject;
      _flagBalls.Add(flagBall);
    }
  }

  private int CompareHeights((float height, int index) x, (float height, int index) y) {
    return (int)(y.height - x.height);
  }

  private int CalcUpperFace() {
    var data = new List<(float height, int index)>();
    for (int i = 0; i < 6; i++) {
      float height = _flagBalls[i].transform.position.y;
      data.Add((height, i));
    }
    data.Sort(CompareHeights);
    if (data[0].height - data[1].height > _minDelta) {
      return data[0].index + 1;
    } else {
      // The highest two faces are so close, implying that the dice might be oblique.
      return 0;
    }
  }
}
