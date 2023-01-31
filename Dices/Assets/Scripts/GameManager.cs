using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;

public class GameManager : MonoBehaviour{
  private const int _diceNum = 6;
  private readonly List<Dice> _dices = new List<Dice>();
  private readonly List<int> _counters = new List<int>();
  private readonly List<TMP_Text> _counterLabels = new List<TMP_Text>();

  public Dice RefDice;
  public GameObject Toolbar;
  public TMP_Text _totalCounter;

  protected IEnumerator Start() {
    Setup();
    yield return Play();
  }

  private void Setup() {
    RefDice.gameObject.SetActive(false);
    for (int i = 0; i < _diceNum; i++) {
      var dice = Object.Instantiate(RefDice).GetComponent<Dice>();
      dice.gameObject.SetActive(true);
      _dices.Add(dice);
    }
    _totalCounter = Toolbar.transform.Find("Total").GetComponent<TMP_Text>();
    for (int i = 0; i < 6; i++) {
      _counters.Add(0);
      var counterLabel = Toolbar.transform.Find($"CountDice{i + 1}").GetComponent<TMP_Text>();
      _counterLabels.Add(counterLabel);
      _counterLabels[i].text = "0";
    }
  }

  private void ResetDices() {
    for (int i = 0; i < _diceNum; i++) {
      var dice = _dices[i];
      int z = i / 3;
      int x = i % 3;
      dice.transform.localPosition = new Vector3(-15 + x * 10, 60, -10 + z * 20);
      dice.RandomRotate();
    }
  }

  private IEnumerator Play() {
    int count = 0;
    while (true) {
      count++;
      _totalCounter.text = $"# {count}";

      ResetDices();

      yield return new WaitForSeconds(1);

      while (AreDicesMoving()) {
        yield return null;
      }

      var deltas = new Dictionary<int, int> {
        [1] = 0,
        [2] = 0,
        [3] = 0,
        [4] = 0,
        [5] = 0,
        [6] = 0,
      };

      foreach (var dice in _dices) {
        if (dice.State > 0) {
          deltas[dice.State] += 1;
        }
      }

      for (int i = 1; i <= 6; i++) {
        if (deltas[i] > 0) {
          yield return BumpNumberAnimation(_counters[i - 1], deltas[i], _counterLabels[i - 1]);
          _counters[i - 1] += deltas[i];
        }
      }

      yield return new WaitForSeconds(1);
    }
  }

  private IEnumerator BumpNumberAnimation(int old, int delta, TMP_Text label) {
    for (int i = 0; i < 3; i++) {
      label.text = $"{old}";
      yield return new WaitForSeconds(.1f);
      label.text = $"{old} <color=#f00>+{delta}</color>";
      yield return new WaitForSeconds(.1f);
    }
    label.text = $"{old + delta}";
    yield return new WaitForSeconds(.1f);
  }

  private bool AreDicesMoving() {
    foreach (var dice in _dices) {
      if (dice.State < 0) {
        return true;
      }
    }
    return false;
  }
}
