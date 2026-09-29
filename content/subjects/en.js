export default {
  id: 'en',
  name: 'Английский язык',
  display: 'ENGLISH',
  color: 'violet',
  sticker: 'bubble',
  tagline: 'Грамматика, словообразование, письмо и проект — и олимпиадный английский.',
  sdamgia: 'https://en-ege.sdamgia.ru',
  exam: {
    tasks: 42,
    duration: '3 ч 10 мин + 17 мин',
    minScore: 22,
    maxPrimary: 82,
    note: String.raw`Письменная часть — 38 заданий за 3 ч 10 мин: аудирование, чтение, грамматика и лексика, письмо. Устная часть — 4 задания за 17 минут, проходит в отдельный день. Максимум — 82 первичных балла, порог — **22 тестовых балла**.`,
  },
  sections: [
    { title: 'Аудирование (1–9)', items: ['1–2: понимание основного содержания и запрашиваемой информации', '3–9: полное понимание — выбор ответа из трёх'] },
    { title: 'Чтение (10–18)', items: ['10: заголовки к коротким текстам', '11: пропущенные части предложений', '12–18: полное понимание — выбор ответа из четырёх'] },
    { title: 'Грамматика и лексика (19–36)', items: ['19–24: грамматические формы слов', '25–29: словообразование', '30–36: лексика — выбор слова из четырёх вариантов'] },
    { title: 'Письмо (37–38)', items: ['37: электронное письмо другу, 100–140 слов', '38: высказывание по таблице или диаграмме, 200–250 слов'] },
    { title: 'Устная часть (4 задания, 17 минут)', items: ['1: чтение текста вслух', '2: условный диалог-расспрос — 4 вопроса', '3: интервью — ответы на 5 вопросов', '4: монолог — обоснование выбора фотографий для проекта'] },
  ],
  theory: [
    {
      title: 'Времена: шпаргалка',
      body: String.raw`| Время | Когда | Маркеры | Пример |
|---|---|---|---|
| Present Simple | регулярно, факты | usually, every day, often | She usually walks to school. |
| Present Continuous | прямо сейчас | now, at the moment, Look! | They are playing chess now. |
| Present Perfect | результат к настоящему, опыт | already, yet, just, ever, since, for | I have already done my homework. |
| Past Simple | закончилось в прошлом, известно когда | yesterday, ago, last year, in 2010 | We moved here two years ago. |
| Past Continuous | процесс в момент прошлого | while, at 5 pm yesterday | I was reading when he called. |
| Past Perfect | раньше другого действия в прошлом | by the time, before, after | The film had started by the time we arrived. |
| Future Simple | прогноз, спонтанное решение | tomorrow, next week, I think | I think it will rain. |

**Страдательный залог** = be в нужном времени + третья форма глагола (V3): is built, was built, has been built, will be built.

**Совет:** в заданиях 19–24 сначала найди маркер времени, потом реши, кто совершает действие (залог), и только потом согласуй с подлежащим.`,
    },
    {
      title: 'Словообразование',
      body: String.raw`| Что образуем | Суффиксы | Примеры |
|---|---|---|
| Существительное | -tion/-sion, -ment, -ness, -ity, -ance/-ence, -ship | decision, development, kindness, ability, importance, friendship |
| Человек | -er/-or, -ist, -ian, -ant | teacher, actor, scientist, musician, assistant |
| Прилагательное | -ful, -less, -ous, -able/-ible, -al, -ive, -ic, -y | useful, careless, dangerous, comfortable, national, creative, scientific, sunny |
| Наречие | -ly | quickly, happily |
| Глагол | -en, -ise/-ize, -ify | widen, realise, simplify |

**Отрицательные приставки:** un- (unusual), in- (independent), im- перед p, m (impossible, immoral), il- перед l (illegal), ir- перед r (irresponsible), dis- (disagree), mis- — «неправильно» (misunderstand).

**Алгоритм:** какая часть речи нужна по месту в предложении → какой суффикс → нужна ли по смыслу отрицательная приставка → нужно ли множественное число.`,
    },
    {
      title: 'Письмо (37) и проект (38)',
      body: String.raw`### Электронное письмо — 100–140 слов
Меньше 90 слов — 0 баллов; если больше 154, проверяют только первые 140.

1. Обращение: Hi Ben, / Dear Ben,
2. Благодарность за письмо: Thanks for your email.
3. Ссылка на прошлые контакты: Sorry I haven't written for so long.
4. Ответы на все вопросы друга.
5. Три своих вопроса по теме из задания.
6. Завершающая фраза: I'd better go now. Write back soon!
7. Подпись на отдельной строке: Best wishes, / Love, и имя.

### Проект — 200–250 слов
Меньше 180 слов — 0 баллов; если больше 275, проверяют только часть в пределах требуемого объёма. Каждый пункт плана — отдельный абзац.

| Пункт плана | Полезные фразы |
|---|---|
| Вступление | Nowadays..., This project is devoted to... |
| 2–3 факта | According to the survey..., ...% of the respondents... |
| Сравнения | ...is twice as popular as..., In contrast,... |
| Проблема и решение | One of the problems is..., A possible solution is... |
| Вывод | To conclude, I believe that... |`,
    },
    {
      title: 'Где баллы: разделы экзамена',
      body: String.raw`Письмо и устная часть вместе дают почти половину результата — их стоит тренировать с первого месяца подготовки.

:::chart
{"title": "Первичные баллы по разделам (всего 82)", "labels": ["Аудирование", "Чтение", "Грамматика и лексика", "Письмо", "Устная часть"], "values": [12, 12, 18, 20, 20], "unit": "б."}
:::

Устная часть идёт в отдельный день и длится 17 минут: чтение вслух, 4 вопроса по рекламе, интервью из 5 вопросов и монолог с обоснованием выбора фотографий.`,
    },
  ],
  tasks: [
    {
      id: 'e19',
      kind: 'ege',
      n: '19',
      title: 'Грамматика: Present Perfect Passive',
      level: 'база',
      statement: String.raw`Прочитайте текст. Преобразуйте слово, напечатанное заглавными буквами после текста, так, чтобы оно грамматически соответствовало содержанию. Заполните пропуск полученной формой.

> *Harry Potter and the Philosopher's Stone* first came out in 1997. Since then, millions of copies of the book ______ in dozens of languages all over the world.

**SELL**`,
      answer: 'have been sold',
      accept: ['HAVE BEEN SOLD'],
      short: String.raw`Маркер Since then требует Present Perfect. Копии продают, а не они продают — значит, страдательный залог. Подлежащее copies во множественном числе. Итог: **have been sold**.`,
      hints: [
        String.raw`Посмотри на маркер времени Since then. Какое время он требует?`,
        String.raw`Копии книги не продают сами себя — действие совершают над ними. Какой нужен залог?`,
        String.raw`Подлежащее — copies. Что нужно: has или have? И какая третья форма у глагола sell?`,
      ],
      full: String.raw`## Что дано
Пропуск в сказуемом, дан глагол **SELL**. Нужно выбрать время, залог и согласовать форму с подлежащим.

## Правило
| Время | Действительный залог | Страдательный залог |
|---|---|---|
| Present Simple | sell / sells | am / is / are sold |
| Past Simple | sold | was / were sold |
| Present Perfect | have / has sold | have / has been sold |
| Future Simple | will sell | will be sold |

## Решение по шагам
1. **Since then** («с тех пор») — маркер Present Perfect: действие началось в прошлом и продолжается до сих пор.
2. Подлежащее **copies** — это то, что продают, а не те, кто продаёт → страдательный залог.
3. Формула Present Perfect Passive: have / has + been + V3.
4. **copies** — множественное число → have.
5. **sell** — неправильный глагол: sell — sold — sold.

Получаем: millions of copies of the book **have been sold**.

## Типичные ошибки
- **have sold** — действительный залог: выходит, будто копии сами что-то продали.
- **were sold** — Past Simple не сочетается с since.
- **has been sold** — не согласовано с подлежащим во множественном числе.
- **have been selled** — sell неправильный глагол, его формы нужно знать наизусть.

**Ответ:** have been sold.`,
    },
    {
      id: 'e25',
      kind: 'ege',
      n: '25',
      title: 'Словообразование: приставка и суффикс',
      level: 'база',
      statement: String.raw`Прочитайте текст. Преобразуйте слово, напечатанное заглавными буквами после текста, так, чтобы оно грамматически и лексически соответствовало содержанию. Заполните пропуск полученным словом.

> The seats in the old bus were so ______ that we could hardly wait for the journey to end.

**COMFORT**`,
      answer: 'uncomfortable',
      accept: ['UNCOMFORTABLE'],
      short: String.raw`После were so нужно прилагательное: comfort → comfortable. Пассажиры ждали конца поездки, значит, сиденья были неудобными → **uncomfortable**.`,
      hints: [
        String.raw`Какая часть речи нужна после were so ... that? Переведи: «сиденья были такими ..., что мы еле дождались конца поездки».`,
        String.raw`Образуй прилагательное от comfort. Теперь подумай о смысле: пассажиры хотели, чтобы поездка скорее закончилась. Сиденья были удобными?`,
        String.raw`Отрицательных приставок несколько: un-, in-, dis-, im-. Выбери ту, что образует реально существующее слово.`,
      ],
      full: String.raw`## Что дано
Пропуск после **were so ... that**, исходное слово **COMFORT** (существительное «удобство»).

## Правило
1. После be so / such ... that в роли сказуемого нужно **прилагательное**.
2. Суффикс прилагательного -able: comfort → comfortable, enjoy → enjoyable.
3. Если по смыслу нужно «не-», добавляем отрицательную приставку. Перед comfortable используют **un-**.

| Приставка | Примеры |
|---|---|
| un- | unhappy, unusual, uncomfortable |
| in- | incorrect, independent |
| im- (перед p, m) | impossible, immoral |
| dis- | dishonest, disagree |

## Решение по шагам
1. Часть речи: were so ___ — прилагательное.
2. comfort + -able = comfortable.
3. Смысл: «мы еле дождались конца поездки» — сиденья были **неудобными**.
4. un- + comfortable = **uncomfortable**.

## Типичные ошибки
- **comfortable** — грамматически верно, но смысл противоположный. Всегда проверяй, нужна ли приставка «не-».
- **uncomfortably** — это наречие, а после were нужно прилагательное.
- **discomfort** — существительное «дискомфорт», не подходит по части речи.
- **incomfortable**, **discomfortable** — таких слов нет.

**Ответ:** uncomfortable.`,
    },
    {
      id: 'e30',
      kind: 'ege',
      n: '30',
      title: 'Лексика: make или do',
      level: 'высокий',
      statement: String.raw`Выберите слово, которое подходит по смыслу. Запишите номер ответа.

> You can take the bus or the train — it won't ______ much difference, as both of them get there in an hour.

1. do
2. take
3. make
4. give`,
      answer: '3',
      short: String.raw`Устойчивое сочетание **make a difference** — «иметь значение, влиять». Правильный ответ — 3.`,
      hints: [
        String.raw`Это задание не на грамматику, а на сочетаемость: какой глагол традиционно употребляется с существительным difference?`,
        String.raw`Вспомни похожие выражения: ... a mistake, ... a decision, ... progress. Во всех стоит один и тот же глагол.`,
      ],
      full: String.raw`## Что дано
Пропуск перед сочетанием much difference, четыре глагола с похожим значением «делать, давать».

## Правило
Выбор глагола здесь определяет **устойчивое сочетание** (коллокация), а не перевод. Такие сочетания нужно учить блоками.

| Глагол | Устойчивые сочетания |
|---|---|
| make | a difference, a mistake, a decision, an effort, progress, friends, a noise |
| do | homework, the shopping, someone a favour, your best, harm, business |
| take | a photo, part, place, a break |
| give | advice, a speech, someone a hand |

Грубая подсказка: **make** — создать что-то новое или получить результат, **do** — выполнить работу или действие.

## Решение по шагам
1. Смысл: «неважно, автобус или поезд, — разницы почти не будет».
2. «Иметь значение, влиять» по-английски — **make a difference**.
3. Вариант 3.

## Типичные ошибки
- **do a difference** — калька с русского «делать разницу», такого сочетания нет.
- **give a difference** — тоже калька; give сочетается с advice, speech, hand.

**Ответ:** 3.`,
    },
    {
      id: 'e12',
      kind: 'ege',
      n: '12',
      title: 'Чтение: вопрос на понимание',
      level: 'высокий',
      statement: String.raw`Прочитайте текст и выберите ответ, который соответствует его содержанию. Запишите номер ответа.

> When Mia moved to a new school in the middle of the year, she expected the worst. Everyone had already made friends, the teachers seemed strict, and even the canteen smelled different. For the first two weeks she spent every break in the library, pretending to be busy with a book she was not really reading. Then one afternoon the librarian asked her to help sort a box of old comics. Two boys from her class came in, saw the comics and stayed. By the end of the week the three of them had started a comic club, and Mia was surprised to find that she no longer counted the days until the summer holidays.

**Why did Mia spend her breaks in the library at first?**

1. She wanted to read as many books as possible.
2. She did not feel comfortable among her new classmates.
3. The librarian had asked her to help with the comics.
4. She was preparing for difficult exams.`,
      answer: '2',
      short: String.raw`Мия пришла в новую школу, где «все уже подружились», и лишь **делала вид**, что читает. Значит, она пряталась от неловкости среди новых одноклассников — вариант 2.`,
      hints: [
        String.raw`Найди в тексте фрагмент про первые две недели. Что Мия делала в библиотеке на самом деле?`,
        String.raw`Слово pretending («притворяясь») — ключ. Если Мия не читала, зачем она туда ходила? Посмотри на начало текста.`,
        String.raw`Проверь вариант 3 по времени: когда именно библиотекарь попросила о помощи — до или после первых двух недель?`,
      ],
      full: String.raw`## Стратегия для заданий 12–18
1. Прочитай вопрос **до** текста и выдели ключевые слова: why, at first, library.
2. Найди в тексте фрагмент, который отвечает на вопрос.
3. Проверь каждый вариант по тексту. Неверные варианты часто содержат слова из текста, но искажают смысл.

## Разбор вариантов
| Вариант | Что в тексте | Вывод |
|---|---|---|
| 1. Хотела прочитать как можно больше книг | pretending to be busy with a book she was not really reading | неверно: она не читала |
| 2. Ей было неуютно среди новых одноклассников | she expected the worst, everyone had already made friends | **верно**: она пряталась от неловкости |
| 3. Библиотекарь попросила помочь с комиксами | Then one afternoon... — это случилось **позже** | неверно: не причина, а поворот сюжета |
| 4. Готовилась к трудным экзаменам | об экзаменах ничего нет | неверно |

## Типичные ошибки
- Выбирать вариант, в котором есть знакомые слова из текста (library, comics), не проверив смысл и время события.
- Отвечать «по логике жизни», а не по тексту: ответ должен опираться на конкретную фразу.

**Ответ:** 2.`,
    },
    {
      id: 'e37',
      kind: 'ege',
      n: '37',
      title: 'Электронное письмо другу',
      level: 'база',
      statement: String.raw`You have received an email message from your English-speaking pen-friend Ben:

> From: Ben@mail.uk
> To: Russian_friend@ege.ru
> Subject: Books
>
> ...I've just finished a fantasy novel that I couldn't put down, and now I'm looking for something new to read. Do you prefer paper books or e-books? Why? What was the last book you really enjoyed? How much time do you usually spend reading?
>
> By the way, my sister is going to take part in a school drama competition next month...

Write an email to Ben. In your message:
- answer his questions;
- ask 3 questions about his sister's drama competition.

Write 100–140 words. Remember the rules of email writing.`,
      answer: null,
      short: String.raw`Структура: обращение → благодарность за письмо → ссылка на прошлые контакты → ответы на три вопроса Бена → три вопроса о конкурсе сестры → завершающая фраза → подпись и имя на отдельных строках. Объём 100–140 слов.`,
      hints: [
        String.raw`Выпиши все вопросы Бена. Сколько их? На каждый нужен отдельный ответ — вопрос «Why?» тоже считается.`,
        String.raw`Твои три вопроса должны касаться именно конкурса сестры, а не книг. Используй разные вопросительные слова: what, how, when.`,
        String.raw`Проверь «рамку» письма: обращение, благодарность, ссылка на прошлые контакты, завершающая фраза, подпись.`,
      ],
      full: String.raw`## Что требуется
Личное письмо в неофициальном стиле. Эксперт проверяет: решена ли задача (ответы и вопросы), организацию текста (абзацы, рамка письма) и языковое оформление.

## Сколько вопросов у Бена
1. Do you prefer paper books or e-books? **Why?** — это два пункта: выбор и причина.
2. What was the last book you really enjoyed?
3. How much time do you usually spend reading?

## Образец письма
> Hi Ben,
>
> Thanks for your email. It was great to hear from you! Sorry I haven't written for so long, but I've been really busy with my exams.
>
> As for your questions, I prefer paper books because I like turning the pages, and my eyes get tired of screens. The last book I really enjoyed was *The Hobbit* by Tolkien. It's funny and exciting at the same time. I don't have much free time now, but I try to read for half an hour every evening.
>
> It's great that your sister is taking part in a drama competition! What play are they going to perform? What role will she play? How does she feel about performing on stage?
>
> Anyway, I'd better go now. Write back soon!
>
> Best wishes,
> Andrey

## Чек-лист
| Элемент | Есть ли в образце |
|---|---|
| Обращение с запятой | Hi Ben, |
| Благодарность | Thanks for your email. |
| Ссылка на прошлые контакты | Sorry I haven't written for so long... |
| Ответы на все вопросы | paper books + причина, The Hobbit, half an hour |
| Три вопроса по теме | play, role, feelings |
| Завершающая фраза | I'd better go now. Write back soon! |
| Подпись и имя на отдельных строках | Best wishes, / Andrey |

## Типичные ошибки
- Пропустить вопрос «Why?» — задача решена не полностью.
- Задать вопросы не по теме (о книгах вместо конкурса) или меньше трёх.
- Официальный стиль (Dear Sir, Yours faithfully) — в письме другу он неуместен.
- Выйти за пределы объёма: меньше 90 слов — 0 баллов за всё задание.`,
    },
    {
      id: 'e38',
      kind: 'ege',
      n: '38',
      title: 'Проект по таблице',
      level: 'высокий',
      statement: String.raw`Imagine that you are doing a project on **how teenagers in Zetland spend their free time**. You have found some data on the subject — the results of an opinion poll (respondents could choose more than one option). Comment on the data in the table and give your opinion on the subject of the project.

| Leisure activity | Percentage of respondents |
|---|---|
| Watching videos online | 72% |
| Playing video games | 58% |
| Doing sport | 41% |
| Meeting friends offline | 37% |
| Reading books | 23% |

Write 200–250 words. Use the following plan:
- make an opening statement on the subject of the project;
- select and report 2–3 facts;
- make 1–2 comparisons where relevant and give your comments;
- outline a problem that can arise with spending free time in these ways and suggest a way of solving it;
- conclude by giving and explaining your opinion on the importance of a balanced way of spending free time.`,
      answer: null,
      short: String.raw`Пять абзацев по плану: вступление → 2–3 факта с цифрами → 1–2 сравнения с комментарием → проблема и её решение → вывод со своим мнением. Нейтральный стиль, без сокращений, 200–250 слов.`,
      hints: [
        String.raw`Выбери для фактов самые заметные строки: максимум, минимум и что-то между ними. Каждый факт подкрепи цифрой.`,
        String.raw`Для сравнения удобно поставить рядом онлайн- и офлайн-занятия. Во сколько раз отличаются цифры?`,
        String.raw`Проблема должна вытекать из данных таблицы. Что может случиться с подростком, который почти всё свободное время проводит у экрана?`,
      ],
      full: String.raw`## Что требуется
Развёрнутое высказывание в **нейтральном стиле**: без сокращений вроде it's и don't, без обращений к читателю. Каждый пункт плана — отдельный абзац.

## Данные наглядно
:::chart
{"title": "How teenagers in Zetland spend their free time", "labels": ["Videos online", "Video games", "Sport", "Friends offline", "Reading"], "values": [72, 58, 41, 37, 23], "unit": "%"}
:::

Видно главное: онлайн-занятия лидируют, чтение — на последнем месте. Это и есть материал для сравнения и проблемы.

## Образец
> Nowadays teenagers have lots of ways to spend their free time, and their choices say a lot about their generation. That is why my project is devoted to the leisure activities of young people in Zetland.
>
> According to the survey, watching videos online is the most popular activity: 72% of the respondents chose it. Playing video games comes second with 58%, while doing sport was mentioned by 41% of teenagers.
>
> It is interesting to compare online and offline activities. Only 37% of young people prefer meeting friends offline, which is about half the share of those who watch videos online. Reading books turns out to be the least popular option: it was chosen by just 23% of the respondents, which is more than three times lower than the figure for online videos. In my opinion, this shows that screens have become the centre of teenagers' leisure.
>
> However, spending too much time in front of a screen may lead to health problems, such as poor eyesight and lack of physical activity. One possible solution is to set a daily screen-time limit and replace part of it with outdoor activities or sports clubs.
>
> To conclude, I believe that free time should be balanced. Online entertainment is not harmful in itself, but real communication, sport and reading help teenagers grow up healthy and well-rounded, so they should not be forgotten.

## Как проверить себя
| Пункт плана | Что в образце |
|---|---|
| Вступление | тема проекта и почему она важна |
| 2–3 факта | 72%, 58%, 41% — с цифрами |
| Сравнения с комментарием | 37% против 72%, 23% против 72% + вывод о роли экранов |
| Проблема и решение | здоровье → лимит экранного времени |
| Вывод | своё мнение с объяснением |

## Типичные ошибки
- Пересказывать всю таблицу подряд: нужно **выбрать** 2–3 факта.
- Сравнивать без комментария: после цифр объясни, что они значат.
- Взять проблему, не связанную с данными (например, дорогие билеты в кино).
- Написать меньше 180 слов — работа получит 0 баллов.`,
    },
    {
      id: 'o1',
      kind: 'olymp',
      n: null,
      title: 'Инверсия: Hardly … when',
      level: 'региональный',
      statement: String.raw`Complete the second sentence so that it has a similar meaning to the first one. Use from two to five words.

> The film had just started when the lights went out.

> Hardly ______ when the lights went out.`,
      answer: 'had the film started',
      accept: ['HAD THE FILM STARTED', 'had the film begun', 'HAD THE FILM BEGUN'],
      short: String.raw`После Hardly в начале предложения — инверсия: вспомогательный глагол перед подлежащим. Время сохраняется — Past Perfect: **Hardly had the film started when the lights went out.**`,
      hints: [
        String.raw`Предложение начинается с Hardly. Что происходит с порядком слов после наречий вроде Never, Rarely, Hardly в начале предложения?`,
        String.raw`В исходном предложении Past Perfect: had started. Какой вспомогательный глагол нужно вынести перед подлежащим?`,
        String.raw`Проверь, чтобы смысл «едва началось — и тут» сохранился, а ответ уложился в пять слов.`,
      ],
      full: String.raw`## Идея
Если предложение начинается с отрицательного или ограничительного наречия, в английском происходит **инверсия**: вспомогательный глагол встаёт перед подлежащим, как в вопросе. Это приём книжного, эмоционального стиля — его любят проверять на олимпиадах.

| Начало предложения | Пример |
|---|---|
| Never / Rarely / Seldom | Never have I seen such a view. |
| Hardly / Scarcely ... when | Hardly had we arrived when it started to rain. |
| No sooner ... than | No sooner had we arrived than it started to rain. |
| Not only ... but also | Not only did he sing, but he also danced. |
| Only then | Only then did I understand the truth. |
| Under no circumstances | Under no circumstances should you open this door. |

## Решение по шагам
1. Исходное: The film **had** just **started** when... — Past Perfect.
2. Hardly уже значит «едва, только что», поэтому just убираем.
3. Инверсия: вспомогательный **had** встаёт перед подлежащим **the film**.
4. Hardly **had the film started** when the lights went out. — четыре слова в пропуске.

## Типичные ошибки
- **Hardly the film had started** — нет инверсии.
- **Hardly did the film start** — неверное время: с hardly ... when используется Past Perfect.
- **Hardly had the film just started** — just дублирует смысл hardly.
- Путать пары: hardly / scarcely — **when**, no sooner — **than**.

**Ответ:** had the film started.`,
    },
    {
      id: 'o2',
      kind: 'olymp',
      n: null,
      title: 'Лишнее слово: эпонимы',
      level: 'школьный этап',
      statement: String.raw`Which word is the odd one out? Write it down and explain your choice.

**sandwich, cardigan, wellingtons, boycott, umbrella**`,
      answer: 'umbrella',
      accept: ['UMBRELLA'],
      short: String.raw`Четыре слова — **эпонимы**, то есть произошли от имён людей: граф Сэндвич, граф Кардиган, герцог Веллингтон, капитан Бойкот. **Umbrella** — от итальянского ombrello, восходящего к латинскому umbra «тень».`,
      hints: [
        String.raw`Подумай не о значении слов (еда, одежда, действие), а об их происхождении.`,
        String.raw`Три слова связаны с британскими аристократами XVIII–XIX веков. Слышал ли ты про графа Сэндвича?`,
        String.raw`Одно слово пришло в английский из другого языка и не связано ни с чьим именем. Какое?`,
      ],
      full: String.raw`## Идея
На первый взгляд слова из разных тем: еда, одежда, обувь, общественное действие, предмет. Значит, объединяет их не значение, а **происхождение**. Слова, образованные от имён людей, называют **эпонимами**.

## Разбор
| Слово | Происхождение |
|---|---|
| sandwich | Джон Монтегю, 4-й граф Сэндвич (XVIII век). По легенде, просил подавать мясо между ломтями хлеба, чтобы не отрываться от игры или работы. |
| cardigan | Джеймс Брюднелл, 7-й граф Кардиган, командовал лёгкой кавалерийской бригадой в Крымской войне. Вязаный жакет носили британские офицеры. |
| wellingtons | Артур Уэлсли, 1-й герцог Веллингтон, победитель при Ватерлоо, ввёл в моду высокие сапоги особого кроя. Сейчас так называют резиновые сапоги. |
| boycott | Чарльз Бойкот, управляющий имением в Ирландии. В 1880 году местные жители отказались иметь с ним дело — так появилось слово «бойкот». |
| umbrella | От итальянского ombrello, восходящего к латинскому umbra «тень»: зонт сначала защищал от солнца. **Не эпоним.** |

## Как отвечать на олимпиаде
Одного слова мало: жюри ждёт **объяснения принципа**. Хороший ответ: «umbrella — единственное слово, не образованное от имени человека; остальные — эпонимы» и краткая справка о каждом.

## Похожие эпонимы для тренировки
- **leotard** — от французского акробата Жюля Леотара;
- **saxophone** — от бельгийского мастера Адольфа Сакса.

**Ответ:** umbrella.`,
    },
  ],
  olymp: {
    intro: String.raw`Олимпиадный английский — это язык за пределами школьной программы: инверсия, тонкости времён, идиомы, различия близких по смыслу слов, а ещё история и культура англоязычных стран. Выигрывает не тот, кто выучил больше списков, а тот, у кого развито чувство языка — его дают регулярное чтение и слушание оригинальных текстов.`,
    vsosh: String.raw`**ВсОШ по английскому языку** проходит в четыре этапа: школьный (сентябрь–октябрь), муниципальный (ноябрь–декабрь), региональный (январь–февраль) и заключительный (март–апрель).

Олимпиада состоит из двух туров:
- **письменный тур** — аудирование (Listening), чтение (Reading), лексико-грамматический тест (Use of English) и письмо (Writing);
- **устный тур** (Speaking).

На школьном и муниципальном этапах набор конкурсов может быть сокращён — уточняй требования своего региона. Уровень заданий заметно выше ЕГЭ: важны точная грамматика, богатый словарь и знание реалий англоязычных стран.

Победители и призёры заключительного этапа получают право поступления **без вступительных испытаний (БВИ)** на направления, соответствующие профилю олимпиады.`,
    rsosh: [
      { name: 'Олимпиада «Высшая проба» (иностранный язык)', org: 'НИУ ВШЭ', note: 'Нестандартные задания продвинутого уровня; заключительный этап очно.' },
      { name: 'Олимпиада «Ломоносов» (иностранный язык)', org: 'МГУ имени М. В. Ломоносова', note: 'Английский, немецкий и французский; сложность заданий зависит от класса.' },
      { name: 'Олимпиада школьников СПбГУ (иностранный язык)', org: 'СПбГУ', note: 'Отборочный и заключительный этапы.' },
      { name: 'Герценовская олимпиада школьников', org: 'РГПУ им. А. И. Герцена', note: 'Иностранные языки: английский, немецкий, французский, испанский, китайский.' },
      { name: 'Евразийская лингвистическая олимпиада', org: 'МГЛУ', note: 'Международная олимпиада по иностранным языкам.' },
    ],
    topics: [
      'Времена и согласование времён',
      'Инверсия: Never have I..., Hardly had... when',
      'Условные предложения, в том числе смешанные',
      'Сложное дополнение и сложное подлежащее',
      'Словообразование: приставки, суффиксы, конверсия',
      'Фразовые глаголы и идиомы',
      'Коллокации: make / do, say / tell',
      'Перефразирование с ключевым словом',
      'Британский и американский английский',
      'Реалии англоязычных стран: история, литература, традиции',
      'Эссе и аргументация',
    ],
    links: [
      { title: 'Архив ВсОШ', url: 'https://vos.olimpiada.ru/', note: 'Задания и решения этапов прошлых лет.' },
      { title: 'Перечень олимпиад РСОШ', url: 'https://rsr-olymp.ru/', note: 'Актуальный список олимпиад и их уровни на текущий год.' },
      { title: 'Олимпиада.ру', url: 'https://olimpiada.ru/', note: 'Календарь олимпиад, архивы заданий, новости.' },
      { title: 'ФИПИ', url: 'https://fipi.ru/', note: 'Демоверсии ЕГЭ и открытый банк заданий по английскому.' },
      { title: 'Cambridge Dictionary', url: 'https://dictionary.cambridge.org/', note: 'Толковый словарь с примерами, произношением и коллокациями.' },
    ],
  },
};
