# Zwariowana Lista
Zwariowana Lista

## Struktura list

Strona główna `index.html` prowadzi do dwóch niezależnych list:

- ZLL: `lists/zll/index.html`, z levelami z głównego `levels.json`.
- Zwariowany Challenge List: `lists/challenge/index.html`, z wyzwaniami z `lists/challenge/levels.json`.

W obu plikach JSON kolejność elementów wyznacza miejsce na liście. Challenge List może mieć maksymalnie 150 aktywnych wyzwań. Jej punkty są liczone tą samą krzywą co ZLL, ale osobno według rankingu Challenge; wyniki i ukończenia Challenge nie zmieniają punktów ZLL.

Ukończenia Challenge zapisuj przy graczu w `players.json` w opcjonalnym polu `ChallengeDemons`. Wartością może być nazwa lub ID wyzwania:

```json
{
  "Player": "NazwaGracza",
  "Demons": ["Level z ZLL"],
  "ChallengeDemons": ["Nazwa wyzwania"]
}
```

Wspólne arkusze i skrypty są w `assets/css/` i `assets/js/`. Widoki list znajdują się w osobnych katalogach `lists/zll/` i `lists/challenge/`.

## Punktacja

Punktacja opada po krzywej: TOP 1 daje 350 RK, TOP 2 około 326 RK, TOP 3 około 312 RK, TOP 50 daje 50 RK, a TOP 150 daje 1 RK. Wynik jest zaokrąglany do pełnych punktów RK; osobnej premii dla TOP 30–50 nie ma.

## Legacy levele

Aby ukryć level z widocznych list, dodaj do jego wpisu w `levels.json` pole `"legacy": "true"`. Wpis pozostanie w pliku, ale nie będzie wyświetlany ani uwzględniany w aktywnych punktach RK. Pole może też mieć wartość logiczną `true`.

## Progres graczy

Plik `progress.json` przechowuje ozdobne informacje o postępie graczy na levelach, które są już na naszej liście i nie zostały przez nich ukończone. Wpisy są wyświetlane na karcie levela, przy szczegółach gracza w wyszukiwarce oraz na stronie `progress.html`, dostępnej przyciskiem „PROGRES” w nawigacji. Progres publikujemy dopiero od 50% na levelu i nie daje on punktów RK. Po dodaniu levela do `Demons` gracza w `players.json`, jego progres dla tego levela nie jest wyświetlany.

`progress.json` zawiera tablicę wpisów w formacie. W pliku znajdują się przykładowe wpisy testowe — zastąp je prawdziwymi danymi albo usuń przed publikacją. JSON nie obsługuje komentarzy, dlatego przykłady są oznaczone nazwami graczy:

```json
[
  {
    "level-name": "Atomic cannon",
    "level-id": "77681476",
    "player": "NazwaGracza",
    "opponent": "NazwaRywala",
    "procent": 71
  }
]
```

`procent` może być liczbą od 0 do 100 (także tekstem, np. `"71"`), zakresem w formacie `"72-100"` albo tablicą takich wartości, np. `["71", "71-100"]`. Zakres oznacza, że pasek zaznaczy odcinek od 72% do 100% i odwróci jego gradient, a tablica łączy podane odcinki na jednym pasku. Używaj ID z `levels.json` w polu `level-id`.

Pole `opponent` jest opcjonalne. Podaj w nim dokładną nazwę gracza z `players.json`, aby na stronie `progress.html` wyświetlić najkrótszą ścieżkę leveli do dogonienia go punktami RK. Propozycja uwzględnia maksymalnie trzy levele oraz punkty leveli z aktywnej listy.

```json
"procent": ["71", "71-100"]
```

## Predykcja levela

Strona `prediction.html` przyjmuje numeryczne ID levela z adresu AREDL i sprawdza jego aktualną pozycję na głównej liście AREDL. Na tej podstawie przewiduje miejsce levela w ZLL oraz punkty RK według aktualnego wzoru punktacji. To szacunek oparty na rankingu AREDL, nie ręczna ocena trudności ZLL.
