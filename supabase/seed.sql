-- seed.sql — one-time seed of the shared database with the Fig. 2 papers.
-- Run in the Supabase SQL editor AFTER schema.sql. Safe to run once.
-- (Runs as the service role in the SQL editor, so RLS insert policies are bypassed.)

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('VanAtter et al. (2026)', 2026, 'Robo-physical model used as an experimental platform.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.15, 0.58, ARRAY['rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Libby et al. (2012)', 2012, 'Tail-assisted aerial righting; both a platform and a mechanistic model.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.34, 0.7, ARRAY['rep','mechanistic']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Steinhardt et al. (2021)', 2021, 'Robotic platform probing form–function relationships.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.2, 0.55, ARRAY['rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Cieply & Moore (2026)', 2026, 'Robotic model organism for controlled locomotion experiments.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.12, 0.63, ARRAY['rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Zhang et al. (2023)', 2023, 'Robo-physical model for form–function study.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.16, 0.66, ARRAY['rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Sponberg et al. (2015)', 2015, 'Robotic platform investigating biophysical mechanisms.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.22, 0.61, ARRAY['rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Dufour et al. (2020)', 2020, 'Robotic surrogate used in behavioral experiments.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.3, 0.5, ARRAY['rep','perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Patricelli & Krakauer (2010)', 2010, 'Robotic female sage grouse used to study courtship behavior.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.36, 0.48, ARRAY['rep','perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Danforth et al. (2020)', 2020, 'Robotic model organism for behavioral and evolutionary experiments.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.4, 0.52, ARRAY['rep','perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Hannaford et al. (1995)', 1995, 'Anthroform biorobotic arm; a reductionist model used as a platform.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.32, 0.64, ARRAY['rep','reductionist']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Nyakatura et al. (2019)', 2019, 'OroBOT — reconstructed locomotion of the extinct tetrapod Orobates.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.42, 0.7, ARRAY['reductionist','rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Jayaram & Full (2016)', 2016, 'CRAM — cockroach-inspired compressible robot from a body-compliance mechanism.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.48, 0.78, ARRAY['mechanistic','rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Saranli et al. (2001)', 2001, 'RHex — hexapedal runner using a sprawled-posture locomotion principle.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.62, 0.72, ARRAY['mechanistic']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Agerholm & Lord (1961)', 1961, 'Early pneumatic artificial muscle actuator.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.66, 0.68, ARRAY['mechanistic','task']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Kim et al. (2008)', 2008, 'Stickybot — gecko adhesion-inspired climbing robot.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.58, 0.7, ARRAY['mechanistic']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Asbeck et al. (2006)', 2006, 'Directional dry-adhesion climbing inspired by gecko/insect attachment.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.6, 0.66, ARRAY['mechanistic']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Ramezani et al. (2017)', 2017, 'Bat Bot — flapping-wing MAV replicating bat wing kinematics.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.64, 0.74, ARRAY['mechanistic','reductionist']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Lynch et al. (2002)', 2002, 'Mechanism-informed legged/limbed design.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.52, 0.7, ARRAY['mechanistic']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Niikura et al. (2022)', 2022, 'Detailed musculoskeletal replica emphasizing structural fidelity.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.72, 0.66, ARRAY['reductionist']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Chen et al. (2023)', 2023, 'Robotic stimulus for animal-interaction experiments.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.58, 0.5, ARRAY['perceptual','rep']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Bingham et al. (2024)', 2024, 'Animatronic figure prioritizing lifelike appearance and motion.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.7, 0.4, ARRAY['perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Azocar et al. (2018)', 2018, 'Prosthesis matching natural gait patterns and appearance.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.64, 0.44, ARRAY['perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Sansoni et al. (2016)', 2016, 'Design emphasizing naturalistic perception by an observer.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.66, 0.42, ARRAY['perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Zekaria et al. (2026)', 2026, 'Biological phantom for medical training.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.6, 0.46, ARRAY['perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Razoki et al. (2025)', 2025, 'Bio-inspired architectural form emphasizing naturalistic presentation.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.72, 0.36, ARRAY['perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Li et al. (2025)', 2025, 'Laser/hologram visual stimuli of prey and conspecifics presented to fish.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.55, 0.42, ARRAY['perceptual']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Yoo et al. (2023)', 2023, 'Achieves a biologically motivated task with an independent mechanism.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.8, 0.32, ARRAY['task']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Wang et al. (2025)', 2025, 'Adopts a biological task as a target without the biological mechanism.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.84, 0.28, ARRAY['task']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Yap et al. (2022)', 2022, 'Task-driven design using biology as an existence proof.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.78, 0.34, ARRAY['task']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Lee et al. (2025)', 2025, 'Lizard-inspired task capability realized by independent means.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.82, 0.3, ARRAY['task']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Kriegman et al. (2020)', 2020, 'Xenobots — computer-designed living machines built from frog cells.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.3, 0.92, ARRAY['bioexploitation']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Carlsen & Sitti (2014)', 2014, 'Bacteria-propelled microswimmers using living cells as actuators.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.38, 0.86, ARRAY['bioexploitation']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Hung et al. (2025)', 2025, 'SKOOTR — biology considered only after design and fabrication (authors'' example).', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.84, 0.14, ARRAY['backspiration']::text[], 'seed' from p;

with p as (
  insert into papers (label, year, blurb, seed, author_name)
  values ('Sedal et al. (2023)', 2023, 'Sequential Auxetic robot — a self-cited example of Backspiration.', true, 'seed')
  returning id
)
insert into suggestions (paper_id, x, y, categories, author_name)
select id, 0.88, 0.1, ARRAY['backspiration']::text[], 'seed' from p;

