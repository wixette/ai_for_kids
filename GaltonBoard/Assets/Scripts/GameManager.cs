using System.Collections;
using UnityEngine;

public class GameManager : MonoBehaviour {
  private const int _num = 3000;
  private GameObject _ballRef;
  private GameObject _balls;
  private Vector3 _initPos;
  private int _count = 0;
  private float _rotateDelta = 0.005f;
  private float _rotateSteps = 3000;

  void Awake() {
    _ballRef = GameObject.Find("/BallRef");
    _initPos = _ballRef.transform.position;
    _ballRef.SetActive(false);
    _balls = GameObject.Find("/Balls");
  }

  IEnumerator Start() {
    for (int i = 0; i < _num; i++) {
      var ball = Object.Instantiate(_ballRef, _balls.transform);
      ball.transform.position = new Vector3(_initPos.x + Random.Range(-0.01f, 0.01f),
                                            _initPos.y + Random.Range(-0.01f, 0.01f),
                                            _initPos.z + Random.Range(-0.01f, 0.01f));
      ball.SetActive(true);
      yield return new WaitForSeconds(.3f);
    }
  }

  void Update() {
    Camera.main.transform.RotateAround(Vector3.zero, Vector3.up, _rotateDelta);
    _count++;
    if (_count % _rotateSteps == 0) {
      _count = 0;
      _rotateDelta *= -1;
    }
  }
}
