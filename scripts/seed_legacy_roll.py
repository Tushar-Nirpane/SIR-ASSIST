#!/usr/bin/env python3
"""
Seed script: generate ≥500 synthetic legacy electoral roll records (2002-2004).

Features:
  - Realistic Hindi/Marathi transliterated names (common in Maharashtra/UP/MP)
  - Intentional spelling variants for fuzzy-match testing (e.g. Shreekant/Shrikant)
  - Some NULL DOBs (mimics incomplete legacy records)
  - Some empty-string father names (graceful NULL handling testing)
  - Pre-computed Soundex codes at insert time
  - Idempotent: checks if data already seeded before inserting

Run:
    python scripts/seed_legacy_roll.py

Requires DATABASE_URL environment variable (or .env file).
"""

import asyncio
import os
import random
import re
import sys
import uuid
from datetime import date, timedelta

import jellyfish

# Add parent dir to path so `app` is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings

# ---------------------------------------------------------------------------
# Name pools — common transliterated Hindi/Marathi first + last names
# ---------------------------------------------------------------------------
FIRST_NAMES = [
    "Suresh", "Ramesh", "Mahesh", "Dinesh", "Rakesh",
    "Shreekant", "Shrikant", "Shreekanta", "Shrikanth",  # variant cluster
    "Rajesh", "Naresh", "Ganesh", "Umesh", "Viresh",
    "Prashant", "Prashanth", "Prashanthi",
    "Santosh", "Santhosh",
    "Prakash", "Pramesh", "Pramod",
    "Vijay", "Vijaya", "Vijayakumar",
    "Anil", "Anil Kumar", "Anirudh",
    "Sanjay", "Sanjeev", "Sanjiv",
    "Deepak", "Dip", "Dipesh",
    "Rajan", "Rajendran",
    "Mohan", "Mohana", "Mohankumar",
    "Krishnakant", "Krishnakumar", "Krishna",
    "Bhaskar", "Bhaskaran",
    "Chandrakant", "Chandrakanta", "Chandra",
    "Devendra", "Devender",
    "Hemant", "Hemanta",
    "Jayant", "Jayanta",
    "Kailash", "Kailashnath",
    "Laxman", "Lakshman", "Lakshmana",
    "Narayan", "Narayana",
    "Om Prakash", "Omprakash",
    "Pandurang", "Pandhari",
    "Ravindra", "Rabindra", "Ravinder",
    "Shyam", "Shyamlal", "Shyamsundar",
    "Tukaram", "Tulsiram",
    "Uttam", "Uttamrao",
    "Vasant", "Vasanta", "Vasantrao",
    "Waman", "Vamanrao",
    "Yogesh", "Yashwant", "Yashwantrao",
    # Female names
    "Sunita", "Sunitabai",
    "Kavita", "Kavitabai",
    "Savita", "Savitabai",
    "Rekha", "Rekhabai",
    "Usha", "Ushaben",
    "Meena", "Meenabai", "Mina",
    "Lata", "Lataben",
    "Nirmala", "Nirmalabai",
    "Sushila", "Sushilabai",
    "Pushpa", "Pushpabai",
]

LAST_NAMES = [
    "Deshmukh", "Deshpande",
    "Patil", "Patil", "Patel",  # common — intentionally repeated
    "Shinde", "Shindhe",
    "Jadhav", "Jadhave",
    "Kulkarni", "Kulkerni",
    "Pawar", "Powar",
    "More", "Mor",
    "Gaikwad", "Gaikwade", "Gaekwad",
    "Salve", "Salvi",
    "Kadam", "Kadame",
    "Mane", "Manhe",
    "Thakare", "Thakre", "Thakur",
    "Bhosale", "Bhosle",
    "Waghmare", "Waghmore",
    "Nagare", "Nagre",
    "Bansode", "Bansodhe",
    "Rokade", "Rokde",
    "Chavan", "Chawan",
    "Nimbalkar", "Nimbhalkar",
    "Mohite", "Mohit",
    "Kale", "Kala",
    "Sawant", "Savant",
    "Rane", "Ran",
    "Shirke",
    "Gore",
    "Ingale", "Ingole",
    "Tambe", "Tambekar",
    "Muthe", "Mutthe",
    "Lokhande", "Lokande",
    "Birje", "Birji",
    "Kamble", "Kambale",
    "Maske", "Maski",
    "Khandare", "Khandre",
    "Bhagat", "Bhakat",
    "Tiwari", "Tewari", "Trivedi",
    "Sharma", "Sarma",
    "Verma", "Varma",
    "Singh", "Sing",
    "Yadav", "Yadaw",
    "Mishra", "Misra",
    "Gupta", "Gupte",
    "Joshi", "Joshy",
    "Nair", "Nayre",
    "Pillai", "Pillae",
    "Reddy", "Redy",
    "Naidu",
]

ADDRESS_CODES = [
    f"MH-{district:02d}-{booth:04d}"
    for district in range(1, 21)
    for booth in range(1, 30)
]
random.shuffle(ADDRESS_CODES)
ADDRESS_CODES = ADDRESS_CODES[:200]  # Use a subset

POLLING_STATIONS = [f"PS-{i:04d}" for i in range(1, 101)]


# ---------------------------------------------------------------------------
# Known test fixture (acceptance test #3: Shreekant/Shrikant variant)
# ---------------------------------------------------------------------------
KNOWN_TEST_RECORDS = [
    {
        "elector_name": "Shrikant Ramrao Deshmukh",
        "father_or_husband_name": "Ramrao Deshmukh",
        "mother_name": "Savita Deshmukh",
        "dob": date(1975, 6, 15),
        "address_code": "MH-05-0001",
        "polling_station_id": "PS-0042",
        "roll_year": 2003,
    },
    {
        # Variant with slightly different transliteration
        "elector_name": "Shreekanth Ramrao Deshmukh",
        "father_or_husband_name": "Ramrao Vishnu Deshmukh",
        "mother_name": None,
        "dob": date(1972, 3, 20),
        "address_code": "MH-05-0002",
        "polling_station_id": "PS-0042",
        "roll_year": 2002,
    },
    {
        # Marathi name pattern
        "elector_name": "Kavitabai Pandurang Waghmare",
        "father_or_husband_name": "Pandurang Waghmare",
        "mother_name": "Sushila Waghmare",
        "dob": date(1968, 11, 5),
        "address_code": "MH-12-0015",
        "polling_station_id": "PS-0055",
        "roll_year": 2004,
    },
    {
        # NULL DOB — tests graceful NULL handling
        "elector_name": "Suresh Tukaram Kamble",
        "father_or_husband_name": "Tukaram Kamble",
        "mother_name": None,
        "dob": None,
        "address_code": "MH-08-0007",
        "polling_station_id": "PS-0031",
        "roll_year": 2002,
    },
]


def random_date_of_birth() -> date | None:
    """Return a random DOB between 1940-1985, or None (15% chance of missing)."""
    if random.random() < 0.15:
        return None
    start = date(1940, 1, 1)
    end = date(1985, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def make_name_variant(name: str) -> str:
    """
    Apply a random transliteration-style variant to a name component.
    Simulates spelling differences common in legacy electoral records.
    """
    variant_map = {
        "ee": ["ee", "i", "e"],
        "aa": ["aa", "a"],
        "th": ["th", "t", "tth"],
        "kh": ["kh", "k"],
        "gh": ["gh", "g"],
        "dh": ["dh", "d"],
        "bh": ["bh", "b"],
        "ph": ["ph", "f", "p"],
        "rao": ["rao", "roa", "ro"],
        "kant": ["kant", "kanta", "kanth"],
        "sh": ["sh", "s"],
    }
    for orig, choices in variant_map.items():
        if orig in name.lower():
            replacement = random.choice(choices)
            name = re.sub(orig, replacement, name, count=1, flags=re.IGNORECASE)
            break
    return name


def generate_synthetic_record() -> dict:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    elector_name = f"{first} {last}"

    # Father name
    father_first = random.choice(FIRST_NAMES)
    father_last = last if random.random() > 0.3 else random.choice(LAST_NAMES)
    father_name = f"{father_first} {father_last}"
    if random.random() < 0.4:
        father_name = make_name_variant(father_name)

    # Mother name: optional (30% missing)
    mother_name = None
    if random.random() > 0.3:
        mother_first = random.choice(FIRST_NAMES)
        mother_name = f"{mother_first} {last}"

    # Apply variant to elector name in 35% of cases
    if random.random() < 0.35:
        elector_name = make_name_variant(elector_name)

    return {
        "elector_name": elector_name,
        "father_or_husband_name": father_name,
        "mother_name": mother_name,
        "dob": random_date_of_birth(),
        "address_code": random.choice(ADDRESS_CODES),
        "polling_station_id": random.choice(POLLING_STATIONS),
        "roll_year": random.choice([2002, 2003, 2004]),
    }


def compute_soundex(name: str | None) -> str | None:
    """Compute Soundex using jellyfish. Returns None for empty/None names."""
    if not name or not name.strip():
        return None
    return jellyfish.soundex(name.strip().upper())


async def seed(session: AsyncSession) -> None:
    # Check if already seeded
    result = await session.execute(
        text("SELECT COUNT(*) FROM legacy_electoral_roll")
    )
    count = result.scalar_one()
    if count >= 500:
        print(f"ℹ️  Legacy roll already has {count} records. Skipping seed.")
        return

    print("🌱 Seeding legacy_electoral_roll...")

    records = list(KNOWN_TEST_RECORDS)  # Start with known fixtures

    # Generate enough random records to hit >= 520 total
    target = 520
    while len(records) < target:
        records.append(generate_synthetic_record())

    from app.models.legacy_roll import LegacyElectoralRoll

    # Insert in batches using ORM
    BATCH_SIZE = 100
    inserted = 0
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i: i + BATCH_SIZE]
        objects = []
        for rec in batch:
            objects.append(
                LegacyElectoralRoll(
                    id=uuid.uuid4(),
                    elector_name=rec["elector_name"] or "",
                    father_or_husband_name=rec["father_or_husband_name"] or "",
                    mother_name=rec.get("mother_name"),
                    dob=rec.get("dob"),
                    address_code=rec.get("address_code"),
                    polling_station_id=rec.get("polling_station_id"),
                    roll_year=rec["roll_year"],
                    elector_name_soundex=compute_soundex(rec["elector_name"]),
                    father_name_soundex=compute_soundex(
                        rec["father_or_husband_name"]
                    ),
                )
            )

        session.add_all(objects)
        await session.flush()
        inserted += len(objects)
        print(f"  Inserted batch {i // BATCH_SIZE + 1}: {inserted} records so far...")

    await session.commit()
    print(f"✅ Seed complete: {inserted} legacy records inserted.")


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session:
        await seed(session)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
